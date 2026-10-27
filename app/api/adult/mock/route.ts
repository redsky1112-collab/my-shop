import { NextResponse } from "next/server";
import { ADULT_COOKIE, ADULT_TTL_MS, adultMode, cookieOpts, makeAdultToken } from "@/lib/adult";

// 개발 전용. adultMode()가 운영 환경에서는 절대 "mock"을 반환하지 않음
export async function POST() {
  if (adultMode() !== "mock") return NextResponse.json({ message: "사용 불가" }, { status: 403 });
  const out = NextResponse.json({ ok: true });
  out.cookies.set(ADULT_COOKIE, makeAdultToken(), { ...cookieOpts, maxAge: ADULT_TTL_MS / 1000 });
  return out;
}
