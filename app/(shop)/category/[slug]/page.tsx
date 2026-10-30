import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isAdultVerified } from "@/lib/adult";
import ProductCard from "@/components/ProductCard";
import { LINES, lineOf } from "@/lib/lines";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ line?: string }>;
}) {
  const { slug } = await params;
  const { line: lineParam } = await searchParams;
  const cat = await prisma.category.findUnique({ where: { slug } });
  if (!cat) notFound();
  const adultOk = await isAdultVerified();
  if (cat.adultOnly && !adultOk) redirect(`/adult-verify?next=/category/${slug}`);

  const products = await prisma.product.findMany({
    where: { categoryId: cat.id, active: true },
    orderBy: { createdAt: "desc" },
  });
  const adult = (p: { adultOnly: boolean }) => p.adultOnly || cat.adultOnly;

  // 성인 전용 카테고리는 라인 구분 없이 기존처럼
  const showLines = !cat.adultOnly && products.some((p) => lineOf(p.line));
  const selected = lineOf(lineParam || "");
  const base = `/category/${slug}`;

  const grid = (list: typeof products) => (
    <div className="grid">
      {list.map((p) => <ProductCard key={p.id} p={p} adult={adult(p)} adultOk={adultOk} />)}
    </div>
  );

  return (
    <>
      <h1 className="page-title">{cat.name}</h1>
      {products.length === 0 && <p className="muted">등록된 상품이 없어요.</p>}

      {showLines && (
        <nav className="line-tabs" aria-label="라인">
          <Link href={base} className={!selected ? "on" : ""}>전체</Link>
          {LINES.map((l) => {
            const n = products.filter((p) => p.line === l.key).length;
            return (
              <Link key={l.key} href={`${base}?line=${l.key}`} className={selected?.key === l.key ? "on" : ""}>
                {l.name} <span className="line-count">{n}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {!showLines && grid(products)}

      {/* 특정 라인 선택 */}
      {showLines && selected && (
        <>
          <p className="line-intro">{selected.desc}</p>
          {grid(products.filter((p) => p.line === selected.key))}
          {products.every((p) => p.line !== selected.key) && <p className="muted">이 라인의 상품을 준비 중이에요.</p>}
        </>
      )}

      {/* 전체: 라인별로 묶어서 보여주기 */}
      {showLines && !selected && (
        <>
          {LINES.map((l) => {
            const list = products.filter((p) => p.line === l.key);
            if (list.length === 0) return null;
            return (
              <section key={l.key} className="line-section">
                <div className="line-section-head">
                  <h2>{l.name}</h2>
                  <Link href={`${base}?line=${l.key}`} className="small muted">{l.desc} →</Link>
                </div>
                {grid(list)}
              </section>
            );
          })}
          {products.some((p) => !lineOf(p.line)) && (
            <section className="line-section">
              <div className="line-section-head"><h2>MORE</h2></div>
              {grid(products.filter((p) => !lineOf(p.line)))}
            </section>
          )}
        </>
      )}
    </>
  );
}
