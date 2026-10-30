import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import ProductCard from "@/components/ProductCard";
import { LINES, lineOf } from "@/lib/lines";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return { title: lineOf(key)?.name ?? "LINE" };
}

export default async function LinePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const line = lineOf(key);
  if (!line) notFound();

  // 라인 페이지는 일반 상품만 (성인 전용 상품 제외)
  const products = await prisma.product.findMany({
    where: { line: line.key, active: true, adultOnly: false, category: { adultOnly: false } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <section className="line-head">
        <p className="hero-tag">{line.ko}</p>
        <h1 className="line-title">{line.name}</h1>
        <p className="line-desc">{line.desc}</p>
        <p className="line-items">{line.items}</p>
      </section>
      <nav className="line-tabs">
        {LINES.map((l) => (
          <Link key={l.key} href={`/line/${l.key}`} className={l.key === line.key ? "on" : ""}>{l.name}</Link>
        ))}
      </nav>
      {products.length === 0 && <p className="muted">곧 새로운 상품이 들어올 예정이에요.</p>}
      <div className="grid">
        {products.map((p) => <ProductCard key={p.id} p={p} adult={false} adultOk={false} />)}
      </div>
    </>
  );
}
