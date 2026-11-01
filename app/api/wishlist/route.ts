import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/user";
import { WISH_MAX, cleanIds } from "@/lib/wish";

const memberIds = async (userId: number) =>
  (await prisma.wish.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { productId: true }, take: WISH_MAX }))
    .map((w) => w.productId);

/** 회원이면 저장된 찜 목록, 비회원이면 member:false (브라우저 저장분 사용) */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ member: false, ids: [] }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ member: true, ids: await memberIds(user.id) }, { headers: { "Cache-Control": "no-store" } });
}

/** 회원 찜 변경: { productId, on } 또는 로그인 직후 { merge: [id...] } */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요해요." }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  if (Array.isArray(body.merge)) {
    const want = cleanIds(body.merge);
    if (want.length) {
      const exist = await prisma.product.findMany({ where: { id: { in: want } }, select: { id: true } });
      await prisma.wish.createMany({
        data: exist.map((p) => ({ userId: user.id, productId: p.id })),
        skipDuplicates: true,
      });
    }
    return NextResponse.json({ ids: await memberIds(user.id) });
  }

  const productId = cleanIds([body.productId])[0];
  if (!productId) return NextResponse.json({ message: "잘못된 요청이에요." }, { status: 400 });
  if (body.on) {
    if ((await prisma.wish.count({ where: { userId: user.id } })) >= WISH_MAX) {
      return NextResponse.json({ message: `찜은 ${WISH_MAX}개까지 할 수 있어요.` }, { status: 400 });
    }
    if (!(await prisma.product.findUnique({ where: { id: productId }, select: { id: true } }))) {
      return NextResponse.json({ message: "없는 상품이에요." }, { status: 404 });
    }
    await prisma.wish.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      update: {},
      create: { userId: user.id, productId },
    });
  } else {
    await prisma.wish.deleteMany({ where: { userId: user.id, productId } });
  }
  return NextResponse.json({ ok: true });
}
