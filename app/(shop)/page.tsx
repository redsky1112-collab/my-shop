import { prisma } from "@/lib/db";
import { isAdultVerified } from "@/lib/adult";
import ProductCard from "@/components/ProductCard";
import ForYou from "@/components/ForYou";
import { getRecProducts } from "@/lib/catalog";
import Link from "next/link";
import { BRAND } from "@/lib/site";

export default async function Home() {
  const adultOk = await isAdultVerified();
  // 메인에는 일반 상품만 노출 (성인 상품은 성인 카테고리 안에서만)
  const products = await prisma.product.findMany({
    where: { active: true, adultOnly: false, category: { adultOnly: false } },
    orderBy: { createdAt: "desc" },
    take: 24,
  });
  const recProducts = await getRecProducts();
  return (
    <>
      <section className="hero">
        <p className="hero-tag">{BRAND.tagline}</p>
        <h1 className="hero-title">{BRAND.headline}</h1>
        <p className="hero-lead">{BRAND.lead}</p>
        <div className="hero-actions">
          <Link href="/style-quiz" className="btn sand">1분 스타일 진단</Link>
          <Link href="/about" className="btn ghost">브랜드 이야기</Link>
        </div>
      </section>
      <ForYou products={recProducts} compact />
      <h2 className="section-title">신상품</h2>
      <div className="grid">
        {products.map((p) => (
          <ProductCard key={p.id} p={p} adult={false} adultOk={adultOk} />
        ))}
      </div>
    </>
  );
}
