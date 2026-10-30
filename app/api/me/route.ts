import { NextResponse } from "next/server";
import { getUser } from "@/lib/user";

const parseStyle = (s: string) => {
  try { return s ? JSON.parse(s) : null; } catch { return null; }
};

// 주문서 자동 채우기용 (로그인한 본인 정보만)
export async function GET() {
  const u = await getUser();
  if (!u) return NextResponse.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(
    { user: { name: u.name, email: u.email, phone: u.phone, style: parseStyle(u.styleProfile) } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
