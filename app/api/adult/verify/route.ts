import { NextResponse } from "next/server";
import { ADULT_COOKIE, ADULT_TTL_MS, cookieOpts, isAdultByBirthDate, makeAdultToken } from "@/lib/adult";

/** 포트원 V2 본인인증 결과를 서버에서 직접 조회해 검증 (클라이언트 결과는 신뢰하지 않음) */
export async function POST(req: Request) {
  if (process.env.ADULT_VERIFY_MODE !== "portone") {
    return NextResponse.json({ message: "본인인증이 설정되지 않았어요." }, { status: 400 });
  }
  const { identityVerificationId } = await req.json().catch(() => ({}));
  if (typeof identityVerificationId !== "string" || !identityVerificationId) {
    return NextResponse.json({ message: "잘못된 요청" }, { status: 400 });
  }

  const res = await fetch(`https://api.portone.io/identity-verifications/${encodeURIComponent(identityVerificationId)}`, {
    headers: { Authorization: `PortOne ${process.env.PORTONE_API_SECRET}` },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ message: "인증 정보를 확인하지 못했어요." }, { status: 400 });
  const data = await res.json();

  if (data.status !== "VERIFIED") return NextResponse.json({ message: "인증이 완료되지 않았어요." }, { status: 400 });
  const birthDate: string = data.verifiedCustomer?.birthDate || "";
  if (!isAdultByBirthDate(birthDate)) {
    return NextResponse.json({ message: "19세 미만은 이용할 수 없어요." }, { status: 403 });
  }

  const out = NextResponse.json({ ok: true });
  out.cookies.set(ADULT_COOKIE, makeAdultToken(), { ...cookieOpts, maxAge: ADULT_TTL_MS / 1000 });
  return out;
}
