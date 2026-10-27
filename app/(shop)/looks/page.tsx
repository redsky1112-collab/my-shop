import Link from "next/link";
import Thumb from "@/components/Thumb";
import { getLooks } from "@/lib/catalog";
import { effPrice } from "@/lib/recommend";
import { STYLES, labelOf, splitTags } from "@/lib/style";
import { won } from "@/lib/format";

export default async function LooksPage() {
  const looks = await getLooks();
  return (
    <>
      <h1 className="page-title">코디 제안</h1>
      {looks.length === 0 && <p className="muted">준비 중이에요.</p>}
      <div className="look-grid">
        {looks.map((l) => {
          const total = l.items.reduce((s, i) => s + effPrice(i.product), 0);
          return (
            <Link key={l.id} href={`/looks/${l.slug}`} className="look-card">
              <Thumb src={l.imageUrl} alt={l.title} />
              <b>{l.title}</b>
              <div className="tags">{splitTags(l.styles).map((s) => <span key={s} className="tag">{labelOf(STYLES, s)}</span>)}</div>
              <span className="muted small">{l.items.length}벌 · 합계 {won(total)}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
