"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/user";
import { onlyDigits } from "@/lib/format";
import { cancelPayment, customerCancelable } from "@/lib/refund";

/** 고객 직접 취소: 배송 시작 전(결제완료) 주문만, 본인 확인 후 전액 취소 */
export async function customerCancel(fd: FormData): Promise<{ error: string } | void> {
  const orderNo = String(fd.get("orderNo") || "");
  const phone = onlyDigits(String(fd.get("phone") || ""));
  const order = await prisma.order.findUnique({ where: { orderNo } });
  if (!order) return { error: "주문을 찾을 수 없어요." };

  // 본인 확인: 로그인 회원이면 본인 주문, 비회원이면 주문자 휴대폰 일치
  const user = await getUser();
  const owner = (user && order.userId === user.id) || (!!phone && phone === order.buyerPhone);
  if (!owner) return { error: "본인 주문만 취소할 수 있어요." };
  if (!customerCancelable(order)) {
    return { error: "이미 배송이 시작됐거나 처리 중인 주문이에요. 교환·반품은 고객센터로 문의해 주세요." };
  }

  const r = await cancelPayment({ orderId: order.id, reason: "고객 주문 취소", restock: true, by: "customer" });
  if (!r.ok) return { error: r.error };
  revalidatePath("/", "layout");
  redirect(user && order.userId === user.id ? "/mypage?canceled=1" : `/order/lookup?orderNo=${orderNo}&phone=${phone}&canceled=1`);
}
