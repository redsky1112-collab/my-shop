"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/user";
import { onlyDigits } from "@/lib/format";
import { claimableQty, claimWindow, parseLines, reasonOf } from "@/lib/claims";

/** 교환·반품 신청 (본인 확인 → 기한·수량·옵션 서버에서 다시 검사) */
export async function submitClaim(fd: FormData): Promise<{ error: string } | void> {
  const orderNo = String(fd.get("orderNo") || "");
  const phone = onlyDigits(String(fd.get("phone") || ""));
  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { items: { include: { product: { include: { variants: true } } } }, claims: true },
  });
  if (!order) return { error: "주문을 찾을 수 없어요." };
  const user = await getUser();
  const isMember = !!user && order.userId === user.id;
  if (!isMember && !(phone && phone === order.buyerPhone)) return { error: "본인 주문만 신청할 수 있어요." };

  const type = String(fd.get("type")) === "EXCHANGE" ? "EXCHANGE" : "RETURN";
  const reason = reasonOf(String(fd.get("reason") || ""));
  if (!reason) return { error: "사유를 골라 주세요." };
  const win = claimWindow(order);
  if (!win.ok) return { error: "신청 기간이 지났어요. 고객센터로 문의해 주세요." };
  if (!reason.sellerFault && !win.buyerOk) return { error: "단순 변심·사이즈 사유는 받은 날부터 7일 안에만 신청할 수 있어요." };

  const detail = String(fd.get("detail") || "").trim().slice(0, 1000);
  const photos = String(fd.get("photos") || "").split(",").filter((u) => /^\/img\/[a-z0-9]+$/i.test(u)).slice(0, 5);
  if (reason.sellerFault && photos.length === 0) return { error: "불량·오배송·상품 차이 사유는 사진을 1장 이상 올려 주세요." };

  const left = claimableQty(order, order.claims);
  const byId = new Map(order.items.map((i) => [i.id, i]));
  const lines = parseLines(String(fd.get("items") || "[]"))
    .map((l) => ({ itemId: Number(l.itemId), qty: Math.floor(Number(l.qty)), toOption: String(l.toOption || "") }))
    .filter((l) => l.qty > 0);
  if (!lines.length) return { error: "신청할 상품과 수량을 골라 주세요." };
  for (const l of lines) {
    const it = byId.get(l.itemId);
    if (!it) return { error: "주문에 없는 상품이에요." };
    if (l.qty > (left.get(l.itemId) ?? 0)) return { error: `${it.name}: 신청 가능한 수량을 넘었어요.` };
    if (type === "EXCHANGE") {
      const opts = it.product.options.split(",").map((s) => s.trim()).filter(Boolean);
      if (opts.length && !opts.includes(l.toOption)) return { error: `${it.name}: 교환할 사이즈를 골라 주세요.` };
      const v = it.product.variants.find((x) => x.option === l.toOption);
      const stock = it.product.variants.length ? v?.stock ?? 0 : it.product.stock;
      if (stock < l.qty) return { error: `${it.name}${l.toOption ? ` (${l.toOption})` : ""}: 교환할 재고가 없어요. 반품으로 신청해 주세요.` };
    } else l.toOption = "";
  }

  await prisma.claim.create({
    data: {
      orderId: order.id, type, reason: reason.key, sellerFault: reason.sellerFault,
      detail, photos: photos.join(","), items: JSON.stringify(lines),
    },
  });
  revalidatePath("/", "layout");
  redirect(isMember ? "/mypage?claimed=1" : `/order/lookup?orderNo=${orderNo}&phone=${phone}&claimed=1`);
}
