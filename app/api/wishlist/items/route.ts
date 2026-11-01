import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdultVerified } from "@/lib/adult";
import { cleanIds } from "@/lib/wish";

/** 찜 목록 화면용 상품 정보 (판매중만). 성인 상품은 인증 전이면 이름·사진을 가림 */
export async function GET(req: Request) {
  const ids = cleanIds((new URL(req.url).searchParams.get("ids") || "").split(","));
  if (!ids.length) return NextResponse.json({ items: [] });
  const [list, adultOk] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: ids }, active: true },
      select: {
        id: true, name: true, slug: true, price: true, salePrice: true, imageUrl: true, stock: true,
        adultOnly: true, category: { select: { adultOnly: true } },
      },
    }),
    isAdultVerified(),
  ]);
  const byId = new Map(list.map((p) => [p.id, p]));
  const items = ids.flatMap((id) => {
    const p = byId.get(id);
    if (!p) return [];
    const adult = p.adultOnly || p.category.adultOnly;
    const masked = adult && !adultOk;
    return [{
      id: p.id, slug: p.slug, price: p.price, salePrice: p.salePrice, stock: p.stock, adult, masked,
      name: masked ? "" : p.name, imageUrl: masked ? null : p.imageUrl,
    }];
  });
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
