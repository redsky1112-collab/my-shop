import { prisma } from "./db";

/** 추천 대상: 판매중 + 일반(비성인) 상품 */
export function getRecProducts() {
  return prisma.product.findMany({
    where: { active: true, adultOnly: false, category: { adultOnly: false } },
    select: {
      id: true, name: true, slug: true, price: true, salePrice: true, imageUrl: true,
      stock: true, options: true, gender: true, styles: true, fit: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}

export function getLooks() {
  return prisma.look.findMany({
    where: { active: true },
    include: {
      items: {
        orderBy: { sort: "asc" },
        include: { product: { include: { category: true } } },
      },
    },
    orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
  });
}
