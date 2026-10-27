import { cookies } from "next/headers";
import { signToken, verifyToken } from "./sign";

export const ADULT_COOKIE = "adult_ok";
export const ADULT_TTL_MS = 1000 * 60 * 60 * 12; // 12시간

export async function isAdultVerified() {
  const c = await cookies();
  return !!verifyToken<{ exp: number; adult: boolean }>(c.get(ADULT_COOKIE)?.value)?.adult;
}

export function makeAdultToken() {
  return signToken({ adult: true, exp: Date.now() + ADULT_TTL_MS });
}

/**
 * 청소년보호법상 청소년: 만 19세 미만 (단, 만 19세가 되는 해의 1월 1일을 맞이한 사람 제외)
 * → 출생연도 기준으로 (올해 - 출생연도) >= 19 이면 성인
 */
export function isAdultByBirthDate(birthDate: string, now = new Date()) {
  const year = Number(birthDate.slice(0, 4));
  if (!year) return false;
  return now.getFullYear() - year >= 19;
}

export function adultMode(): "mock" | "portone" | "disabled" {
  const m = process.env.ADULT_VERIFY_MODE;
  if (m === "portone") return "portone";
  if (m === "mock" && process.env.NODE_ENV !== "production") return "mock";
  // 배포 사이트에서 미리 테스트할 때만 사용. ⚠️ 실제 오픈 전 반드시 삭제!
  if (m === "mock" && process.env.ADULT_MOCK_ALLOW_PROD === "yes-test-only") return "mock";
  return "disabled";
}

export const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
