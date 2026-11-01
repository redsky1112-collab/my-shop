import { cookies } from "next/headers";
import { prisma } from "./db";
import { signToken, verifyToken } from "./sign";
import { isAdmin } from "./admin";

export const USER_COOKIE = "user_session";
export const USER_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30일 로그인 유지
export const STATE_COOKIE = "oauth_state";
export const JOIN_COOKIE = "join_pending"; // 소셜 인증은 끝났지만 약관 동의 전 (15분 유효)

export type Provider = "kakao" | "naver";

// 휴대폰에서 복사·붙여넣기 하면 앞뒤 공백·줄바꿈이 섞이는 경우가 많아 잘라냄
const env = (k: string) => process.env[k]?.trim() || undefined;

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
    clientId: env("KAKAO_REST_API_KEY"),
    clientSecret: env("KAKAO_CLIENT_SECRET"), // 카카오 콘솔에서 Client Secret을 켠 경우만
    authorizeUrl: "https://kauth.kakao.com/oauth/authorize",
    tokenUrl: "https://kauth.kakao.com/oauth/token",
    profileUrl: "https://kapi.kakao.com/v2/user/me",
  },
  naver: {
    label: "네이버",
    clientId: env("NAVER_CLIENT_ID"),
    clientSecret: env("NAVER_CLIENT_SECRET"),
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

/** 테스트 로그인 버튼 노출: 개발 환경, 또는 운영에선 관리자 로그인한 브라우저에서만 (손님에게는 안 보임) */
export async function demoLoginVisible() {
  if (!demoLoginEnabled()) return false;
  return process.env.NODE_ENV !== "production" || (await isAdmin());
}

export type JoinPending = { provider: string; providerId: string; name?: string; email?: string; phone?: string; next: string; exp: number };

export async function getJoinPending() {
  return verifyToken<JoinPending>((await cookies()).get(JOIN_COOKIE)?.value);
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

/** 소셜 계정으로 회원 찾기/만들기. agree가 있으면 약관 동의 기록 (새 회원은 /join 동의 후에만 만들어짐) */
export async function upsertSocialUser(
  provider: string,
  providerId: string,
  p: { name?: string; email?: string; phone?: string },
  agree?: { marketing: boolean },
) {
  const info = {
    ...(p.name ? { name: p.name.slice(0, 50) } : {}),
    ...(p.email ? { email: p.email.slice(0, 100) } : {}),
    ...(p.phone ? { phone: p.phone.replace(/\D/g, "").slice(0, 11) } : {}),
  };
  const now = new Date();
  const consent = agree
    ? { termsAgreedAt: now, marketingAgree: agree.marketing, marketingAgreedAt: agree.marketing ? now : null }
    : {};
  return prisma.user.upsert({
    where: { provider_providerId: { provider, providerId } },
    update: { ...info, ...consent, lastLoginAt: now },
    create: { provider, providerId, ...info, ...consent },
  });
}
