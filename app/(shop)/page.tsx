import { prisma } from "@/lib/db";
import { isAdultVerified } from "@/lib/adult";
import ProductCard from "@/components/ProductCard";

export default async function Home() {
  const adultOk = await isAdultVerified();
  // 메인에는 일반 상품만 노출 (성인 상품은 성인 카테고리 안에서만)
  const products = await prisma.product.findMany({
    where: { active: true, adultOnly: false, category: { adultOnly: false } },
    orderBy: { createdAt: "desc" },
    take: 24,
  });
  return (
    <>
      <section className="hero">
        <h1>이번 시즌 신상품</h1>
        <p className="muted">5만원 이상 무료배송</p>
      </section>
      <div className="grid">
        {products.map((p) => (
          <ProductCard key={p.id} p={p} adult={false} adultOk={adultOk} />
        ))}
      </div>
    </>
  );
}
