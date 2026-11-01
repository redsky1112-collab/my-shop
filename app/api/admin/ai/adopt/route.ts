import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { saveFashnOutput } from "@/lib/fashn";
import { MAX_PRODUCT_IMAGES, galleryOf } from "@/lib/gallery";

/** 관리자: 마음에 드는 AI 결과를 상품 사진에 추가 (우리 DB로 복사 — FASHN 주소는 3일 후 만료) */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ message: "관리자 로그인이 필요해요." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const p = await prisma.product.findUnique({ where: { id: Math.floor(Number(b.productId)) || 0 } });
  if (!p) return NextResponse.json({ message: "상품을 찾을 수 없어요." }, { status: 404 });
  const list = galleryOf(p);
  if (list.length >= MAX_PRODUCT_IMAGES) {
    return NextResponse.json({ message: `상품 사진이 이미 ${MAX_PRODUCT_IMAGES}장이에요. 상품 수정에서 몇 장 빼고 다시 해 주세요.` }, { status: 400 });
  }
  const saved = await saveFashnOutput(String(b.url || ""));
  if ("error" in saved) return NextResponse.json({ message: saved.error }, { status: 400 });
  // 맨 앞(대표)에 둘지 선택: 모델 착용컷이 대표 사진이면 목록에서 더 잘 팔려요
  const images = b.asMain ? [saved.url, ...list] : [...list, saved.url];
  await prisma.product.update({ where: { id: p.id }, data: { images, imageUrl: images[0] } });
  revalidatePath("/", "layout");
  return NextResponse.json({ url: saved.url, images });
}
