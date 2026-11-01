import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Thumb from "@/components/Thumb";
import LookBuy from "./LookBuy";
import { effPrice } from "@/lib/recommend";
import { optionStockOf } from "@/lib/stock";

export default async function LookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const look = await prisma.look.findUnique({
    where: { slug },
    include: { items: { orderBy: { sort: "asc" }, include: { product: { include: { category: true, variants: { orderBy: { sort: "asc" } } } } } } },
  });
  if (!look || !look.active) notFound();
  // 코디에는 성인 상품을 넣지 않음 (혹시 들어가 있어도 제외)
  const items = look.items
    .map((i) => i.product)
    .filter((p) => p.active && !p.adultOnly && !p.category.adultOnly)
    .map((p) => ({
      productId: p.id, slug: p.slug, name: p.name, price: effPrice(p), imageUrl: p.imageUrl,
      options: p.options, fit: p.fit, stock: p.stock, category: p.category.name,
      optionStock: optionStockOf(p.variants),
    }));

  return (
    <div className="detail">
      <Thumb src={look.imageUrl} alt={look.title} />
      <div>
        <div className="muted">코디 제안</div>
        <h1 className="detail-name">{look.title}</h1>
        {look.description && <p className="desc-short">{look.description}</p>}
        <LookBuy items={items} />
      </div>
    </div>
  );
}
