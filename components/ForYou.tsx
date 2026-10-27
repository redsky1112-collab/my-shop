"use client";

import Link from "next/link";
import Thumb from "./Thumb";
import { useStyleProfile } from "./useStyleProfile";
import { RecProduct, recommend, recommendSize, effPrice } from "@/lib/recommend";
import { STYLES, labelOf, splitTags } from "@/lib/style";
import { won } from "@/lib/format";

type LookLite = { slug: string; title: string; imageUrl: string | null; gender: string; styles: string; names: string[] };

/** compact=true: 홈 화면용 (4개 + 더보기) */
export default function ForYou({ products, looks, compact }: { products: RecProduct[]; looks?: LookLite[]; compact?: boolean }) {
  const { profile, loaded } = useStyleProfile();
  if (!loaded) return null;

  if (!profile) {
    return (
      <Link href="/style-quiz" className="quiz-banner">
        <div>
          <b>1분 스타일 진단</b>
          <p>체형·취향을 알려주시면 어울리는 옷과 사이즈를 골라드려요</p>
        </div>
        <span className="arrow">→</span>
      </Link>
    );
  }

  const recs = recommend(products, profile, compact ? 4 : 24);
  const styleText = profile.styles.map((s) => labelOf(STYLES, s)).join("·");
  const myLooks = (looks || [])
    .filter((l) => profile.gender === "U" || l.gender === "U" || l.gender === profile.gender)
    .map((l) => ({ l, hit: splitTags(l.styles).filter((s) => profile.styles.includes(s)).length }))
    .sort((a, b) => b.hit - a.hit)
    .slice(0, 4);

  return (
    <section className="foryou">
      <div className="row between">
        <h2>{styleText} 취향 맞춤 추천</h2>
        <Link href="/style-quiz" className="link">다시 진단</Link>
      </div>
      {recs.length === 0 && <p className="muted">아직 취향에 맞는 상품이 없어요. 곧 채워 둘게요!</p>}
      <div className="grid">
        {recs.map(({ p, r }) => {
          const size = recommendSize(p, profile);
          const price = effPrice(p);
          return (
            <Link key={p.id} href={`/product/${p.slug}`} className="card">
              <Thumb src={p.imageUrl} alt={p.name} />
              <div className="card-body">
                <div className="card-name">{p.name}</div>
                <div className="card-price"><b>{won(price)}</b></div>
                <div className="tags">
                  {r.reasons.slice(0, 2).map((t) => <span key={t} className="tag">{t}</span>)}
                  {size && <span className="tag strong">추천 {size.size}</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {compact && recs.length > 0 && <Link href="/for-you" className="btn outline block more">추천 더보기</Link>}

      {!compact && myLooks.length > 0 && (
        <>
          <h2 className="mt">이런 코디는 어때요?</h2>
          <div className="look-grid">
            {myLooks.map(({ l }) => (
              <Link key={l.slug} href={`/looks/${l.slug}`} className="look-card">
                <Thumb src={l.imageUrl} alt={l.title} />
                <b>{l.title}</b>
                <span className="muted small">{l.names.join(" + ")}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
