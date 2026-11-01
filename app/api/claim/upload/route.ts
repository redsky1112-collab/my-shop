import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/user";
import { onlyDigits } from "@/lib/format";
import { saveUploadedImage } from "@/lib/image";

// 교환·반품 신청 사진: 그 주문의 본인(회원 또는 주문자 휴대폰)만 올릴 수 있음
export async function POST(req: Request) {
  const q = new URL(req.url).searchParams;
  const order = await prisma.order.findUnique({ where: { orderNo: q.get("orderNo") || "" }, select: { userId: true, buyerPhone: true } });
  const user = await getUser();
  const phone = onlyDigits(q.get("phone") || "");
  const owner = !!order && ((user && order.userId === user.id) || (!!phone && phone === order.buyerPhone));
  if (!owner) return NextResponse.json({ message: "본인 주문만 사진을 올릴 수 있어요." }, { status: 403 });
  const r = await saveUploadedImage(req);
  if ("error" in r) return NextResponse.json({ message: r.error }, { status: r.status });
  return NextResponse.json({ url: r.url });
}
