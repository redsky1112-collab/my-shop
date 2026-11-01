// 재입고 알림 공용 값 (DB 접근 없음)
export const RESTOCK_PER_PHONE = 30; // 한 번호당 대기 중 신청 최대

/** 손님에게 보낼 문자 문구. 성인 상품은 상품명을 넣지 않음 */
export function restockMessage(p: { name: string; option: string; adult: boolean; url: string }) {
  const what = p.adult ? "신청하신 상품" : `${p.name}${p.option ? ` (${p.option})` : ""}`;
  return `[DUOLOGUE] 기다리시던 ${what}이 재입고됐어요. 수량이 많지 않아요 → ${p.url}`;
}
