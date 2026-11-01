import { SHIPPING } from "./site";

export const CLAIM_TYPES = { RETURN: "반품", EXCHANGE: "교환" } as const;

export const CLAIM_STATUS: Record<string, string> = {
  REQUESTED: "접수",
  APPROVED: "승인 · 회수 예정",
  COLLECTING: "회수중",
  COMPLETED: "완료",
  REJECTED: "거절",
};

/** 사유별 책임: 판매자 책임이면 배송비 무료 + 신청 기한 길게 */
export const CLAIM_REASONS = [
  { key: "size", label: "사이즈가 맞지 않아요", sellerFault: false },
  { key: "mind", label: "단순 변심", sellerFault: false },
  { key: "different", label: "사진·설명과 달라요", sellerFault: true },
  { key: "defect", label: "상품 불량·하자", sellerFault: true },
  { key: "wrong", label: "다른 상품이 왔어요 (오배송)", sellerFault: true },
] as const;

export const reasonOf = (k: string) => CLAIM_REASONS.find((r) => r.key === k);

// 전자상거래법: 단순 변심은 받은 날부터 7일, 표시·광고와 다르거나 불량이면 받은 날부터 3개월
export const BUYER_DAYS = 7;
export const SELLER_DAYS = 90;

/** 고객 부담 반품 배송비 (무료배송 주문이면 왕복) */
export const returnFee = (orderShippingFee: number) => (orderShippingFee > 0 ? SHIPPING.fee : SHIPPING.fee * 2);

export type ClaimLine = { itemId: number; qty: number; toOption?: string };
export const parseLines = (s: string): ClaimLine[] => {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
};

type O = { status: string; deliveredAt: Date | null; items: { id: number; quantity: number; canceledQty: number }[] };
type C = { status: string; items: string };

/** 상품별 신청 가능 수량 = 주문 수량 − 취소 수량 − 진행 중·완료된 신청 수량 */
export function claimableQty(order: O, claims: C[]) {
  const used = new Map<number, number>();
  for (const c of claims) {
    if (c.status === "REJECTED") continue;
    for (const l of parseLines(c.items)) used.set(l.itemId, (used.get(l.itemId) ?? 0) + l.qty);
  }
  return new Map(order.items.map((i) => [i.id, Math.max(0, i.quantity - i.canceledQty - (used.get(i.id) ?? 0))]));
}

const DAY = 86400000;
/** 신청 가능 여부 (배송중·배송완료 주문, 기한 이내) */
export function claimWindow(order: O, now = Date.now()) {
  if (order.status !== "SHIPPING" && order.status !== "DELIVERED") return { ok: false, buyerOk: false };
  const days = order.deliveredAt ? (now - order.deliveredAt.getTime()) / DAY : 0;
  return { ok: days <= SELLER_DAYS, buyerOk: days <= BUYER_DAYS };
}
