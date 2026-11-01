import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * 토스 결제창 성공 후 리다이렉트되는 곳 (successUrl)
 * ?paymentKey=...&orderId=...&amount=...
 * 1) DB 주문금액과 비교(위변조 방지) → 2) 재고 차감 → 3) 토스 승인 API → 실패 시 재고 복구
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const paymentKey = url.searchParams.get("paymentKey") || "";
  const orderNo = url.searchParams.get("orderId") || "";
  const amount = Number(url.searchParams.get("amount"));
  const fail = (message: string) =>
    NextResponse.redirect(new URL(`/pay/fail?orderNo=${encodeURIComponent(orderNo)}&message=${encodeURIComponent(message)}`, url));

  const order = await prisma.order.findUnique({ where: { orderNo }, include: { items: true } });
  if (!order) return fail("주문을 찾을 수 없어요.");
  if (order.status !== "PENDING") return NextResponse.redirect(new URL(`/order/complete/${orderNo}`, url));
  if (!paymentKey || amount !== order.total) return fail("결제 금액이 주문 금액과 일치하지 않아요.");

  // 2) 재고 선차감 (동시 주문 대비: 재고가 충분할 때만 차감)
  try {
    await prisma.$transaction(async (tx) => {
      for (const it of order.items) {
        // 옵션(사이즈)별 재고가 있는 상품이면 그 옵션에서 먼저 차감
        const hasVariants = (await tx.variant.count({ where: { productId: it.productId } })) > 0;
        if (hasVariants) {
          const v = await tx.variant.updateMany({
            where: { productId: it.productId, option: it.option, stock: { gte: it.quantity } },
            data: { stock: { decrement: it.quantity } },
          });
          if (v.count === 0) throw new Error(`${it.name}${it.option ? ` (${it.option})` : ""} 재고가 부족해요.`);
        }
        const r = await tx.product.updateMany({
          where: { id: it.productId, stock: { gte: it.quantity } },
          data: { stock: { decrement: it.quantity } },
        });
        if (r.count === 0) throw new Error(`${it.name} 재고가 부족해요.`);
      }
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "재고 확인 실패");
  }

  const restoreStock = () =>
    prisma.$transaction(
      order.items.flatMap((it) => [
        prisma.product.update({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } }),
        prisma.variant.updateMany({ where: { productId: it.productId, option: it.option }, data: { stock: { increment: it.quantity } } }),
      ])
    );

  // 3) 승인 요청
  const secret = process.env.TOSS_SECRET_KEY || "";
  let ok = false;
  let message = "결제 승인에 실패했어요.";
  try {
    const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `confirm-${orderNo}`,
      },
      body: JSON.stringify({ paymentKey, orderId: orderNo, amount }),
    });
    const data = await res.json();
    ok = res.ok && data.status === "DONE";
    if (!ok && data?.message) message = data.message;
  } catch {
    message = "결제 서버와 통신하지 못했어요.";
  }

  if (!ok) {
    await restoreStock();
    return fail(message);
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID", paymentKey, paidAt: new Date() },
  });
  return NextResponse.redirect(new URL(`/order/complete/${orderNo}?paid=1`, url));
}
