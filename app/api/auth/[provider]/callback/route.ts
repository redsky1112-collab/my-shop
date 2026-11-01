import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  JOIN_COOKIE, PROVIDERS, STATE_COOKIE, USER_COOKIE, USER_TTL_MS, afterLoginPath, isProvider, makeUserToken, providerEnabled, upsertSocialUser,
  type Provider,
} from "@/lib/user";
import { cookieOpts } from "@/lib/adult";
import { signToken, verifyToken } from "@/lib/sign";
import { prisma } from "@/lib/db";

type Profile = { id: string; name?: string; email?: string; phone?: string };

async function fetchProfile(provider: Provider, code: string, state: string, redirectUri: string): Promise<Profile> {
  const cfg = PROVIDERS[provider];
  // 1) 인가 코드 → 액세스 토큰
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cfg.clientId!,
    redirect_uri: redirectUri,
    code,
    ...(provider === "naver" ? { state } : {}),
    ...(cfg.clientSecret ? { client_secret: cfg.clientSecret } : {}),
  });
  const tr = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
    cache: "no-store",
  });
  const tok = await tr.json().catch(() => ({}));
  if (!tr.ok || !tok.access_token) throw new Error(`token: ${tok.error_description || tok.error || tr.status}`);

  // 2) 액세스 토큰 → 회원 정보
  const pr = await fetch(cfg.profileUrl, { headers: { Authorization: `Bearer ${tok.access_token}` }, cache: "no-store" });
  const me = await pr.json().catch(() => ({}));
  if (!pr.ok) throw new Error(`profile: ${pr.status}`);

  if (provider === "kakao") {
    if (!me.id) throw new Error("profile: no id");
    const acc = me.kakao_account || {};
    return {
      id: String(me.id),
      name: acc.name || acc.profile?.nickname || me.properties?.nickname,
      email: acc.email,
      // 카카오는 +82 10-1234-5678 형태 → 010...
      phone: acc.phone_number ? acc.phone_number.replace(/^\+82\s?/, "0") : undefined,
    };
  }
  const r = me.response || {};
  if (me.resultcode !== "00" || !r.id) throw new Error("profile: naver");
  return { id: String(r.id), name: r.name || r.nickname, email: r.email, phone: r.mobile };
}

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(req.url);
  const fail = (code: string) => {
    const res = NextResponse.redirect(new URL(`/login?error=${code}`, url.origin));
    res.cookies.delete(STATE_COOKIE);
    return res;
  };
  if (!isProvider(provider) || !providerEnabled(provider)) return fail("disabled");

  // 사용자가 동의 화면에서 취소한 경우
  if (url.searchParams.get("error")) return fail("canceled");

  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const saved = verifyToken<{ state: string; provider: string; next: string; exp: number }>(
    (await cookies()).get(STATE_COOKIE)?.value,
  );
  if (!code || !saved || saved.state !== state || saved.provider !== provider) return fail("state");

  try {
    const p = await fetchProfile(provider, code, state, `${url.origin}/api/auth/${provider}/callback`);
    const next = saved.next || "/mypage";
    const found = await prisma.user.findUnique({
      where: { provider_providerId: { provider, providerId: p.id } },
      select: { termsAgreedAt: true },
    });
    // 처음 오신 분(또는 약관 동의 기록이 없는 기존 회원) → 가입 동의 화면. 동의 전에는 회원 정보를 만들지 않음
    if (!found?.termsAgreedAt) {
      const res = NextResponse.redirect(new URL("/join", url.origin));
      res.cookies.delete(STATE_COOKIE);
      res.cookies.set(
        JOIN_COOKIE,
        signToken({ provider, providerId: p.id, name: p.name, email: p.email, phone: p.phone, next, exp: Date.now() + 15 * 60 * 1000 }),
        { ...cookieOpts, maxAge: 15 * 60 },
      );
      return res;
    }
    const user = await upsertSocialUser(provider, p.id, p);
    const res = NextResponse.redirect(new URL(afterLoginPath(user, next), url.origin));
    res.cookies.delete(STATE_COOKIE);
    res.cookies.set(USER_COOKIE, makeUserToken(user.id), { ...cookieOpts, maxAge: USER_TTL_MS / 1000 });
    return res;
  } catch (e) {
    console.error(`[login:${provider}]`, e);
    return fail("failed");
  }
}
