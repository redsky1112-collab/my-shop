import { cookies } from "next/headers";
import { prisma } from "./db";
import { signToken, verifyToken } from "./sign";

export const USER_COOKIE = "user_session";
export const USER_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30일 로그인 유지
export const STATE_COOKIE = "oauth_state";

export type Provider = "kakao" | "naver";

// ── 소셜 로그인 설정 (환경변수에 키가 있어야 버튼이 켜짐) ──
export const PROVIDERS: Record<Provider, {
  label: string;
  clientId?: string;
  clientSecret?: string;
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl: string;
}> = {
  kakao: {
    label: "카카오",
    clientId: process.env.KAKAO_REST_API_KEY,
    clientSecret: process.env.KAKAO_CLIENT_SECRET, // 카카오 콘솔에서 Client Secret을 켠 경우만
    authorizeUrl: "https://kauth.kakao.com/oauth/authorize",
    tokenUrl: "https://kauth.kakao.com/oauth/token",
    profileUrl: "https://kapi.kakao.com/v2/user/me",
  },
  naver: {
    label: "네이버",
    clientId: process.env.NAVER_CLIENT_ID,
    clientSecret: process.env.NAVER_CLIENT_SECRET,
    authorizeUrl: "https://nid.naver.com/oauth2.0/authorize",
    tokenUrl: "https://nid.naver.com/oauth2.0/token",
    profileUrl: "https://openapi.naver.com/v1/nid/me",
  },
};

export const isProvider = (p: string): p is Provider => p === "kakao" || p === "naver";

export function providerEnabled(p: Provider) {
  const c = PROVIDERS[p];
  return p === "kakao" ? !!c.clientId : !!(c.clientId && c.clientSecret);
}

/** 키 발급 전 시연용 테스트 로그인. 운영에서는 ⚠️ 오픈 전 반드시 끄기 */
export function demoLoginEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.AUTH_DEMO_ALLOW_PROD === "yes-test-only";
}

/** 로그인 후 돌아갈 주소: 우리 사이트 내부 경로만 허용 (외부 주소로 튕기는 공격 방지) */
export function safeNext(v: unknown) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/mypage";
}

export async function getUser() {
  const c = await cookies();
  const t = verifyToken<{ exp: number; uid: number }>(c.get(USER_COOKIE)?.value);
  if (!t?.uid) return null;
  return prisma.user.findUnique({ where: { id: t.uid } });
}

/** 로그인 후 이동할 곳: 스타일 진단을 안 했으면 진단 먼저 */
export function afterLoginPath(user: { styleProfile: string }, next: string) {
  return user.styleProfile ? next : `/style-quiz?welcome=1&next=${encodeURIComponent(next)}`;
}

export function makeUserToken(uid: number) {
  return signToken({ uid, exp: Date.now() + USER_TTL_MS });
}

/** 소셜 계정으로 회원 찾기/만들기 (처음이면 자동 가입) */
export async function upsertSocialUser(provider: string, providerId: string, p: { name?: string; email?: string; phone?: string }) {
  const info = {
    ...(p.name ? { name: p.name.slice(0, 50) } : {}),
    ...(p.email ? { email: p.email.slice(0, 100) } : {}),
    ...(p.phone ? { phone: p.phone.replace(/\D/g, "").slice(0, 11) } : {}),
  };
  return prisma.user.upsert({
    where: { provider_providerId: { provider, providerId } },
    update: { ...info, lastLoginAt: new Date() },
    create: { provider, providerId, ...info },
  });
}
