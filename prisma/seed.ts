import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 카테고리가 이미 있으면(= 운영 중) 기본 데이터는 건너뜀. 삭제한 샘플이 되살아나지 않게
  if ((await prisma.category.count()) === 0) await seedBase();
  else console.log("기존 데이터가 있어 기본 시드를 건너뜁니다.");
  await tagSamples();
  await seedLooks();
}

// 샘플 상품에 스타일 태그 (태그가 비어 있는 샘플만, 관리자가 수정한 건 건드리지 않음)
async function tagSamples() {
  const tags: Record<string, { gender: string; styles: string; fit: string; colors: string; sizeChart: string }> = {
    "basic-tee": { gender: "U", styles: "minimal,casual", fit: "regular", colors: "화이트,블랙,그레이",
      sizeChart: "사이즈,어깨,가슴단면,총장\nS,44,50,68\nM,46,53,70\nL,48,56,72\nXL,50,59,74" },
    "overfit-hoodie": { gender: "U", styles: "casual,street", fit: "over", colors: "그레이,블랙",
      sizeChart: "사이즈,어깨,가슴단면,총장\nM,56,62,70\nL,58,65,72\nXL,60,68,74" },
    "wide-denim": { gender: "U", styles: "casual,street", fit: "over", colors: "블루",
      sizeChart: "사이즈,허리단면,허벅지,총장\n28,37,33,102\n30,39,34,103\n32,41,35,104\n34,43,36,105" },
    "cotton-chino": { gender: "M", styles: "dandy,minimal,classic", fit: "slim", colors: "베이지,네이비",
      sizeChart: "사이즈,허리단면,허벅지,총장\n28,37,29,100\n30,39,30,101\n32,41,31,102\n34,43,32,103" },
    "light-padding": { gender: "U", styles: "casual,minimal", fit: "regular", colors: "블랙,네이비", sizeChart: "" },
    "wool-coat": { gender: "M", styles: "dandy,classic,minimal", fit: "regular", colors: "카멜,차콜",
      sizeChart: "사이즈,어깨,가슴단면,총장\nM,46,56,105\nL,48,59,107" },
  };
  for (const [slug, t] of Object.entries(tags)) {
    await prisma.product.updateMany({ where: { slug, styles: "" }, data: t });
  }
}

async function seedLooks() {
  if ((await prisma.look.count()) > 0) return;
  const ids = Object.fromEntries((await prisma.product.findMany({ select: { id: true, slug: true } })).map((p) => [p.slug, p.id]));
  const looks = [
    { title: "월요일 출근룩", slug: "monday-office", styles: "dandy,classic", gender: "M",
      description: "코트에 치노만 맞춰도 단정해 보여요. 안에는 무지 티로 힘을 빼세요.",
      items: ["wool-coat", "basic-tee", "cotton-chino"] },
    { title: "주말 편한 캐주얼", slug: "weekend-casual", styles: "casual,street", gender: "U",
      description: "오버핏 후드와 와이드 데님, 쌀쌀하면 경량 패딩 하나.",
      items: ["overfit-hoodie", "wide-denim", "light-padding"] },
  ];
  for (const l of looks) {
    const { items, ...data } = l;
    const pids = items.map((s) => ids[s]).filter(Boolean);
    if (pids.length < 2) continue;
    await prisma.look.create({ data: { ...data, items: { create: pids.map((productId, i) => ({ productId, sort: i })) } } });
  }
}

async function seedBase() {
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
  console.log("기본 시드 완료");
}

main().finally(() => prisma.$disconnect());
