// 구매 후기 공용 값·계산 (DB 접근 없음 → 브라우저에서도 사용)

export const SIZE_FEELS = [
  { key: "small", label: "작아요" },
  { key: "fit", label: "정사이즈" },
  { key: "big", label: "커요" },
] as const;

export const REVIEW_MIN = 10; // 최소 글자 수
export const REVIEW_MAX = 1000;
export const REVIEW_PHOTOS = 3;
export const SIMILAR_CM = 5; // 키 ±5cm
export const SIMILAR_KG = 5; // 몸무게 ±5kg

/** 이름 가리기: 김민수 → 김*수, 민수 → 민*, 빈 이름 → 회원 */
export function maskName(name: string) {
  const s = [...name.trim()];
  if (s.length === 0) return "회원";
  if (s.length === 1) return `${s[0]}*`;
  if (s.length === 2) return `${s[0]}*`;
  return `${s[0]}${"*".repeat(s.length - 2)}${s[s.length - 1]}`;
}

/** 리뷰를 쓸 수 있는 주문 상품: 배송완료 + 전부 취소되지 않음 */
export function reviewable(order: { status: string }, item: { quantity: number; canceledQty: number }) {
  return order.status === "DELIVERED" && item.canceledQty < item.quantity;
}

type Body = { gender: string; height: number; weight: number; bodyType: string };

/** 나와 비슷한 체형이면 거리(작을수록 비슷) 반환, 아니면 null */
export function bodyDistance(me: Body, r: Body): number | null {
  if (!me.height || !me.weight || !r.height || !r.weight) return null;
  const mf = (g: string) => g === "M" || g === "F";
  if (mf(me.gender) && mf(r.gender) && me.gender !== r.gender) return null;
  const dh = Math.abs(me.height - r.height);
  const dw = Math.abs(me.weight - r.weight);
  if (dh > SIMILAR_CM || dw > SIMILAR_KG) return null;
  return dh + dw + (me.bodyType && r.bodyType && me.bodyType !== r.bodyType ? 3 : 0);
}
