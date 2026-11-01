import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/user";
import { PURCHASED } from "@/lib/coupon";

/** 주문서용: 첫 구매 쿠폰을 쓸 수 있는지 (금액 조건은 화면·서버에서 따로 계산) */
export async function GET() {
  const user = await getUser();
  const headers = { "Cache-Control": "no-store" };
  if (!user) return NextResponse.json({ member: false, firstEligible: false }, { headers });
  const bought = await prisma.order.count({ where: { userId: user.id, status: { in: PURCHASED } } });
  return NextResponse.json({ member: true, firstEligible: bought === 0 }, { headers });
}
