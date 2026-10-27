import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 카테고리가 이미 있으면(= 운영 중) 시드를 건너뜀. 삭제한 샘플이 되살아나지 않게
  if ((await prisma.category.count()) > 0) {
    console.log("기존 데이터가 있어 시드를 건너뜁니다.");
    return;
  }
  const cats = [
    { name: "상의", slug: "top", sort: 1 },
    { name: "하의", slug: "bottom", sort: 2 },
    { name: "아우터", slug: "outer", sort: 3 },
    { name: "성인용품", slug: "adult", sort: 9, adultOnly: true },
  ];
  for (const c of cats) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  const bySlug = Object.fromEntries((await prisma.category.findMany()).map((c) => [c.slug, c.id]));

  const products = [
    { name: "베이직 코튼 반팔 티셔츠", slug: "basic-tee", price: 19000, salePrice: 15900, stock: 120, options: "S,M,L,XL", cat: "top", description: "면 100% 데일리 티셔츠" },
    { name: "오버핏 후드 스웨트셔츠", slug: "overfit-hoodie", price: 49000, stock: 60, options: "M,L,XL", cat: "top", description: "기모 안감, 여유 있는 핏" },
    { name: "와이드 데님 팬츠", slug: "wide-denim", price: 59000, salePrice: 49000, stock: 40, options: "28,30,32,34", cat: "bottom", description: "생지 워싱 와이드 핏" },
    { name: "코튼 치노 팬츠", slug: "cotton-chino", price: 45000, stock: 50, options: "28,30,32,34", cat: "bottom", description: "스판 함유 슬림 치노" },
    { name: "경량 패딩 점퍼", slug: "light-padding", price: 89000, stock: 30, options: "M,L,XL", cat: "outer", description: "가볍고 따뜻한 간절기 패딩" },
    { name: "울 블렌드 코트", slug: "wool-coat", price: 159000, salePrice: 129000, stock: 15, options: "M,L", cat: "outer", description: "울 60% 싱글 코트" },
    { name: "[샘플] 성인용품 A", slug: "adult-sample-a", price: 29000, stock: 20, options: "", cat: "adult", adultOnly: true, description: "성인인증 후에만 노출되는 샘플 상품입니다." },
    { name: "[샘플] 성인용품 B", slug: "adult-sample-b", price: 39000, stock: 20, options: "", cat: "adult", adultOnly: true, description: "성인인증 후에만 노출되는 샘플 상품입니다." },
  ];
  for (const p of products) {
    const { cat, ...data } = p;
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: { ...data, categoryId: bySlug[cat] },
    });
  }
  console.log("시드 완료");
}

main().finally(() => prisma.$disconnect());
