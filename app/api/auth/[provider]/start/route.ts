import { NextResponse } from "next/server";
import crypto from "crypto";
import { PROVIDERS, STATE_COOKIE, isProvider, providerEnabled, safeNext } from "@/lib/user";
import { cookieOpts } from "@/lib/adult";
import { signToken } from "@/lib/sign";

// 카카오/네이버 로그인 창으로 보내기
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(req.url);
  if (!isProvider(provider) || !providerEnabled(provider)) {
    return NextResponse.redirect(new URL("/login?error=disabled", url.origin));
  }
  const cfg = PROVIDERS[provider];
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${url.origin}/api/auth/${provider}/callback`;

  const auth = new URL(cfg.authorizeUrl);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("client_id", cfg.clientId!);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("state", state);

  const res = NextResponse.redirect(auth);
  // 위조 요청 방지용 state + 로그인 후 돌아갈 주소 (10분 유효)
  res.cookies.set(
    STATE_COOKIE,
    signToken({ state, provider, next: safeNext(url.searchParams.get("next")), exp: Date.now() + 10 * 60 * 1000 }),
    { ...cookieOpts, maxAge: 600 },
  );
  return res;
}
