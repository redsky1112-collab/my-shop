import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { setSetting } from "@/lib/fashn";
import { galleryOf } from "@/lib/gallery";

const okUrl = (u: string) => u === "" || /^\/img\/[a-z0-9]+$/i.test(u);

/** 관리자: 브랜드 모델 얼굴 사진(faceRef) 또는 상품의 가상 피팅용 옷 사진(garment) 저장 */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ message: "관리자 로그인이 필요해요." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (typeof b.faceRef === "string") {
    if (!okUrl(b.faceRef)) return NextResponse.json({ message: "사진을 다시 올려 주세요." }, { status: 400 });
    await setSetting("ai_face_ref", b.faceRef);
  }
  if (b.productId && typeof b.garment === "string") {
    const p = await prisma.product.findUnique({ where: { id: Math.floor(Number(b.productId)) || 0 } });
    if (!p) return NextResponse.json({ message: "상품을 찾을 수 없어요." }, { status: 404 });
    if (b.garment && !galleryOf(p).includes(b.garment)) return NextResponse.json({ message: "상품 사진 중에서 골라 주세요." }, { status: 400 });
    await prisma.product.update({ where: { id: p.id }, data: { garmentImage: b.garment } });
    revalidatePath(`/product/${p.slug}`);
  }
  return NextResponse.json({ ok: true });
}
