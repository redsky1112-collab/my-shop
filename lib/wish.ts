// 찜 공용 값 (DB 접근 없음)
export const WISH_MAX = 200;
export const WISH_LOCAL_KEY = "wish_v1"; // 비회원 찜 (이 기기 브라우저)

/** 숫자 id 목록 정리: 양의 정수만, 중복 제거, 최대 WISH_MAX */
export function cleanIds(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const out = new Set<number>();
  for (const x of v) {
    const n = Number(x);
    if (Number.isInteger(n) && n > 0) out.add(n);
    if (out.size >= WISH_MAX) break;
  }
  return [...out];
}
