// 첫 구매 쿠폰 — 조건을 바꾸려면 FIRST_COUPON 값만 수정 (DB 접근 없음 → 주문서 화면에서도 사용)
export const FIRST_COUPON = {
  name: "첫 구매 10% 할인",
  rate: 10,        // 할인율 %
  max: 10000,      // 최대 할인 금액
  minItems: 30000, // 상품금액이 이 이상일 때만
};

/** 주문 상품금액에 대한 첫 구매 할인액 (10원 단위 버림) */
export function firstDiscount(itemsTotal: number) {
  if (itemsTotal < FIRST_COUPON.minItems) return 0;
  return Math.min(FIRST_COUPON.max, Math.floor((itemsTotal * FIRST_COUPON.rate) / 100 / 10) * 10);
}

/** 할인 주문의 상품 일부 환불액: 상품 금액에서 할인액을 금액 비율만큼 나눠서 뺌 */
export function itemsRefund(raw: number, order: { discount: number; itemsTotal: number }) {
  if (!order.discount || order.itemsTotal <= 0) return raw;
  return raw - Math.round((order.discount * raw) / order.itemsTotal);
}

/** 구매가 성립한 주문 상태 (취소된 주문은 제외 → 첫 주문을 전부 취소하면 쿠폰을 다시 쓸 수 있음) */
export const PURCHASED = ["PAID", "SHIPPING", "DELIVERED"];
