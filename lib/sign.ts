import crypto from "crypto";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET 환경변수를 16자 이상으로 설정하세요.");
  return s;
}

function hmac(body: string) {
  return crypto.createHmac("sha256", secret()).update(body).digest("base64url");
}

/** 위변조 방지 토큰 생성 (exp: 만료 시각 ms) */
export function signToken(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body)}`;
}

export function verifyToken<T extends { exp?: number }>(token?: string | null): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(hmac(body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    if (p.exp && Date.now() > p.exp) return null;
    return p;
  } catch {
    return null;
  }
}

export function safeEqual(x: string, y: string) {
  const a = crypto.createHash("sha256").update(x).digest();
  const b = crypto.createHash("sha256").update(y).digest();
  return crypto.timingSafeEqual(a, b);
}
