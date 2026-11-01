import { prisma } from "./db";

export type CancelLine = { itemId: number; qty: number };
export type CancelInput = {
  orderId: number;
  lines?: CancelLine[];      // 비우면 전체 취소
  refundShipping?: boolean;  // 부분 취소 시 배송비도 환불
  restock?: boolean;         // 재고 되돌리기 (불량·훼손 반품이면 끔)
  deduct?: number;           // 환불금에서 뺄 금액 (고객 부담 반품 배송비)
  reason: string;
  by: "admin" | "customer";
};
export type CancelResult = { ok: true; amount: number; full: boolean } | { ok: false; error: string };

/**
 * 결제 취소·환불
 * 1) 취소 수량·금액 계산 (서버 기준) → 2) 토스 취소 API → 3) 성공하면 주문·재고·환불기록 반영
 * 토스 호출이 실패하면 DB는 그대로라서 다시 시도할 수 있음
 */
export async function cancelPayment(input: CancelInput): Promise<CancelResult> {
  const order = await prisma.order.findUnique({ where: { id: input.orderId }, include: { items: true } });
  if (!order) return { ok: false, error: "주문을 찾을 수 없어요." };
  if (order.status === "CANCELED") return { ok: false, error: "이미 취소된 주문이에요." };
  const reason = input.reason.trim().slice(0, 100) || "주문 취소";

  // 결제 전 주문: 돈이 오가지 않았으니 상태만 취소 (재고는 결제 승인 때 차감되므로 되돌릴 것 없음)
  if (order.status === "PENDING" || !order.paymentKey) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELED", canceledAt: new Date() } });
    return { ok: true, amount: 0, full: true };
  }

  // 취소할 수량 (남은 수량 이내로)
  const remain = new Map(order.items.map((i) => [i.id, i.quantity - i.canceledQty]));
  let lines: CancelLine[] = input.lines?.length
    ? input.lines
        .map((l) => ({ itemId: l.itemId, qty: Math.min(Math.max(0, Math.floor(l.qty)), remain.get(l.itemId) ?? 0) }))
        .filter((l) => l.qty > 0)
    : order.items.map((i) => ({ itemId: i.id, qty: remain.get(i.id) ?? 0 })).filter((l) => l.qty > 0);
  const balance = order.total - order.refundedAmount;
  if (balance <= 0) return { ok: false, error: "환불할 금액이 남아 있지 않아요." };
  if (input.lines?.length && lines.length === 0) return { ok: false, error: "취소할 상품과 수량을 골라 주세요." };

  // 남은 상품을 전부 취소하면 전체 취소로 처리 (배송비·선물 포장비까지 남은 금액 전액)
  const remainingAfter = order.items.reduce((s, i) => s + (remain.get(i.id) ?? 0), 0) - lines.reduce((s, l) => s + l.qty, 0);
  const full = remainingAfter <= 0;
  if (full && !input.lines?.length) {
    lines = order.items.map((i) => ({ itemId: i.id, qty: remain.get(i.id) ?? 0 })).filter((l) => l.qty > 0);
  }
  const byId = new Map(order.items.map((i) => [i.id, i]));
  const itemsAmount = lines.reduce((s, l) => s + (byId.get(l.itemId)?.price ?? 0) * l.qty, 0);
  const shipping = !full && input.refundShipping && !order.shippingRefunded ? order.shippingFee : 0;
  const gross = full ? balance : Math.min(balance, itemsAmount + shipping);
  const deduct = Math.max(0, Math.floor(input.deduct ?? 0));
  const amount = gross - deduct;
  if (amount <= 0) return { ok: false, error: "환불 금액이 0원 이하예요. 차감 금액을 확인해 주세요." };

  // 토스 결제 취소 (같은 요청이 두 번 가도 한 번만 처리되도록 Idempotency-Key)
  const secret = process.env.TOSS_SECRET_KEY || "";
  try {
    const res = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(order.paymentKey)}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `cancel-${order.orderNo}-${order.refundedAmount}-${amount}`,
      },
      body: JSON.stringify(full && order.refundedAmount === 0 && deduct === 0 ? { cancelReason: reason } : { cancelReason: reason, cancelAmount: amount }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !["CANCELED", "PARTIAL_CANCELED"].includes(data?.status)) {
      return { ok: false, error: `결제사 취소 실패: ${data?.message || res.status}` };
    }
  } catch {
    return { ok: false, error: "결제사와 통신하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }

  // DB 반영 (토스 취소는 이미 성공 → 여기서 실패하면 로그로 남겨 수동 확인)
  const restock = input.restock !== false;
  const detail = lines.map((l) => { const i = byId.get(l.itemId)!; return `${i.name}${i.option ? `(${i.option})` : ""} ×${l.qty}`; }).join(", ")
    + (deduct > 0 ? ` / 반품 배송비 ${deduct.toLocaleString("ko-KR")}원 차감` : "");
  try {
    await prisma.$transaction(async (tx) => {
      for (const l of lines) {
        const it = byId.get(l.itemId)!;
        await tx.orderItem.update({ where: { id: it.id }, data: { canceledQty: { increment: l.qty } } });
        if (restock) {
          await tx.product.update({ where: { id: it.productId }, data: { stock: { increment: l.qty } } });
          await tx.variant.updateMany({ where: { productId: it.productId, option: it.option }, data: { stock: { increment: l.qty } } });
        }
      }
      await tx.order.update({
        where: { id: order.id },
        data: {
          refundedAmount: { increment: amount }, // 실제 환불액 (차감액은 판매자 수령분)
          shippingRefunded: order.shippingRefunded || full || shipping > 0,
          ...(full ? { status: "CANCELED", canceledAt: new Date() } : {}),
        },
      });
      await tx.refund.create({ data: { orderId: order.id, amount, reason, detail, restocked: restock, by: input.by } });
    });
  } catch (e) {
    console.error("[refund] 토스 취소는 성공했지만 DB 반영 실패", order.orderNo, amount, e);
    return { ok: false, error: "결제는 취소됐지만 주문 정보 반영에 실패했어요. 관리자에게 알려 주세요." };
  }
  return { ok: true, amount, full };
}


/** 고객이 직접 취소할 수 있는 주문인지 (배송 시작 전, 부분취소 이력 없음) */
export const customerCancelable = (o: { status: string; refundedAmount: number }) =>
  (o.status === "PAID" || o.status === "PENDING") && o.refundedAmount === 0;
