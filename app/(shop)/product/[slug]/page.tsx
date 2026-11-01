import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isAdultVerified } from "@/lib/adult";
import AddToCart from "./AddToCart";
import Gallery from "./Gallery";
import { galleryOf } from "@/lib/gallery";
import { won } from "@/lib/format";
import Link from "next/link";
import { parseSizeChart } from "@/lib/recommend";
import { FITS, STYLES, labelOf, splitTags } from "@/lib/style";
import { QuoteMark } from "@/components/Logo";
import { BRAND, GIFT } from "@/lib/site";
import { optionStockOf } from "@/lib/stock";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await prisma.product.findUnique({
    where: { slug },
    include: { category: true, lookItems: { include: { look: true } }, variants: { orderBy: { sort: "asc" } } },
  });
  if (!p || !p.active) notFound();
  const adult = p.adultOnly || p.category.adultOnly;
  if (adult && !(await isAdultVerified())) redirect(`/adult-verify?next=/product/${slug}`);

  const price = p.salePrice && p.salePrice < p.price ? p.salePrice : p.price;
  const options = p.options.split(",").map((s) => s.trim()).filter(Boolean);
  const chart = parseSizeChart(p.sizeChart);
  const tags = [...splitTags(p.styles).map((s) => labelOf(STYLES, s)), p.fit ? labelOf(FITS, p.fit) : ""].filter(Boolean);
  const looks = p.lookItems.map((li) => li.look).filter((l) => l.active);

  return (
    <div className={adult ? "detail private" : "detail"}>
      <Gallery images={galleryOf(p)} alt={p.name} />
      <div>
        <div className="muted">{p.category.name}{adult && <span className="r19-mini">19</span>}</div>
        <h1 className="detail-name">{p.name}</h1>
        <div className="detail-price">
          {price !== p.price && <s className="muted">{won(p.price)}</s>} <b>{won(price)}</b>
        </div>
        <AddToCart
          item={{ productId: p.id, slug: p.slug, name: p.name, price, adultOnly: adult, imageUrl: p.imageUrl }}
          options={options}
          stock={p.stock}
          optionStock={optionStockOf(p.variants)}
          fit={p.fit}
        />
        <div className="gift-banner">
          <QuoteMark size={16} />
          <div>
            <b>선물하시나요? {GIFT.title} +{won(GIFT.fee)}</b>
            <p className="small">{GIFT.desc}</p>
            <p className="small muted">{GIFT.note} 주문서에서 선택할 수 있어요.</p>
          </div>
        </div>
        {tags.length > 0 && (
          <div className="tags mt-s">{tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
        )}
        {chart && (
          <div className="chart">
            <h3>실측 사이즈 (cm)</h3>
            <table className="table">
              <thead><tr>{chart.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{chart.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
        <div className="desc">{p.description}</div>
        {looks.length > 0 && (
          <div className="mt">
            <h3>이 상품이 들어간 코디</h3>
            {looks.map((l) => <Link key={l.id} href={`/looks/${l.slug}`} className="look-link">{l.title} →</Link>)}
          </div>
        )}
        <div className="brand-sign">
          <QuoteMark size={20} />
          <span>{BRAND.slogan}</span>
        </div>
      </div>
    </div>
  );
}
