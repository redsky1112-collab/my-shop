import type { Prisma } from "@prisma/client";

type V = { option: string; stock: number };

/** 옵션별 재고 맵 { M: 3, L: 0 } (옵션 없는 상품이면 null) */
export function optionStockOf(variants: V[] | undefined | null): Record<string, number> | null {
  if (!variants || variants.length === 0) return null;
  return Object.fromEntries(variants.map((v) => [v.option, v.stock]));
}

/** 이 옵션을 qty개 살 수 있는지 (옵션별 재고가 있으면 옵션 기준, 없으면 상품 재고 기준) */
export function availableFor(p: { stock: number; variants?: V[] }, option: string) {
  const v = p.variants?.find((x) => x.option === option);
  if (p.variants && p.variants.length > 0) return v ? v.stock : 0;
  return p.stock;
}

/** 옵션 재고 합계를 상품 재고에 반영 */
export async function syncProductStock(tx: Prisma.TransactionClient, productId: number) {
  const agg = await tx.variant.aggregate({ where: { productId }, _sum: { stock: true }, _count: true });
  if (agg._count > 0) await tx.product.update({ where: { id: productId }, data: { stock: agg._sum.stock ?? 0 } });
}
