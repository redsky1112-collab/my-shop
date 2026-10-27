import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isAdultVerified } from "@/lib/adult";
import ProductCard from "@/components/ProductCard";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = await prisma.category.findUnique({ where: { slug } });
  if (!cat) notFound();
  const adultOk = await isAdultVerified();
  if (cat.adultOnly && !adultOk) redirect(`/adult-verify?next=/category/${slug}`);

  const products = await prisma.product.findMany({
    where: { categoryId: cat.id, active: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <h1 className="page-title">{cat.name}</h1>
      {products.length === 0 && <p className="muted">등록된 상품이 없어요.</p>}
      <div className="grid">
        {products.map((p) => (
          <ProductCard key={p.id} p={p} adult={p.adultOnly || cat.adultOnly} adultOk={adultOk} />
        ))}
      </div>
    </>
  );
}
