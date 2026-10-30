import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/user";

// 로그인 회원의 스타일 진단 결과 저장 (다른 기기에서 로그인해도 같은 추천)
export async function POST(req: Request) {
  const u = await getUser();
  if (!u) return NextResponse.json({ ok: false, message: "로그인이 필요해요." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const json = JSON.stringify(body ?? {});
  if (!body || typeof body !== "object" || json.length > 2000) {
    return NextResponse.json({ ok: false, message: "잘못된 요청이에요." }, { status: 400 });
  }
  await prisma.user.update({ where: { id: u.id }, data: { styleProfile: json } });
  return NextResponse.json({ ok: true });
}
