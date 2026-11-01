import { prisma } from "@/lib/db";
import { isAdultVerified } from "@/lib/adult";
import ProductCard from "@/components/ProductCard";
import ForYou from "@/components/ForYou";
import { getRecProducts } from "@/lib/catalog";
import Link from "next/link";
import { BRAND } from "@/lib/site";
import HeroSlider from "@/components/HeroSlider";

export default async function Home() {
  const adultOk = await isAdultVerified();
  // 메인에는 일반 상품만 노출 (성인 상품은 성인 카테고리 안에서만)
  // 신상품 = 관리자가 '신상품'으로 지정한 상품. 아직 하나도 지정 안 했으면 최근 등록 8개로 대신 채움
  const base = { active: true, adultOnly: false, category: { adultOnly: false } };
  let products = await prisma.product.findMany({ where: { ...base, isNew: true }, orderBy: { createdAt: "desc" }, take: 24 });
  if (products.length === 0) products = await prisma.product.findMany({ where: base, orderBy: { createdAt: "desc" }, take: 8 });
  const recProducts = await getRecProducts();
  const banners = await prisma.banner.findMany({
    where: { active: true },
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    take: 3,
    select: { id: true, imageUrl: true, tagline: true, title: true, sub: true, link: true, full: true },
  });
  return (
    <>
      {banners.length > 0 ? <HeroSlider slides={banners} /> : (
      <section className="hero">
        <p className="hero-tag">{BRAND.tagline}</p>
        <h1 className="hero-title">{BRAND.headline}</h1>
        <p className="hero-lead">{BRAND.lead}</p>
        <div className="hero-actions">
          <Link href="/style-quiz" className="btn sand">1분 스타일 진단</Link>
          <Link href="/about" className="btn ghost">브랜드 이야기</Link>
        </div>
      </section>
      )}
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
