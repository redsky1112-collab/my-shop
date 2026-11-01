"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStyleProfile } from "@/components/useStyleProfile";
import { BODY_TYPES, labelOf } from "@/lib/style";
import { SIMILAR_CM, SIMILAR_KG, SIZE_FEELS, bodyDistance } from "@/lib/reviews";

export type ReviewView = {
  id: number; authorName: string; rating: number; sizeFeel: string; content: string; option: string;
  photos: string[]; gender: string; height: number; weight: number; bodyType: string; date: string;
};

const PAGE = 10;
const stars = (n: number) => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);

function feelStats(list: ReviewView[]) {
  const total = list.filter((r) => r.sizeFeel).length;
  return SIZE_FEELS.map((f) => {
    const c = list.filter((r) => r.sizeFeel === f.key).length;
    return { ...f, pct: total ? Math.round((c / total) * 100) : 0 };
  });
}

function topOption(list: ReviewView[]) {
  const m = new Map<string, number>();
  for (const r of list) if (r.option) m.set(r.option, (m.get(r.option) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

/** 상품 상세 하단 구매 후기: 평점·사이즈 체감 + "나와 비슷한 체형" 필터 */
export default function Reviews({ reviews, slug, adult }: { reviews: ReviewView[]; slug: string; adult: boolean }) {
  const { profile, loaded } = useStyleProfile();
  const [tab, setTab] = useState<"all" | "similar" | "photo">("all");
  const [shown, setShown] = useState(PAGE);

  const similar = useMemo(() => {
    if (!profile || adult) return [];
    return reviews
      .map((r) => ({ r, d: bodyDistance(profile, r) }))
      .filter((x): x is { r: ReviewView; d: number } => x.d !== null)
      .sort((a, b) => a.d - b.d)
      .map((x) => x.r);
  }, [profile, reviews, adult]);
  const photoList = useMemo(() => reviews.filter((r) => r.photos.length > 0), [reviews]);

  const n = reviews.length;
  const avg = n ? reviews.reduce((a, r) => a + r.rating, 0) / n : 0;
  const list = tab === "similar" ? similar : tab === "photo" ? photoList : reviews;
  const pick = (t: typeof tab) => { setTab(t); setShown(PAGE); };
  const simTop = topOption(similar);
  const simFit = feelStats(similar).sort((a, b) => b.pct - a.pct)[0];

  return (
    <section className="reviews" id="reviews">
      <h2 className="reviews-title">리뷰 <span className="muted">{n}</span></h2>
      {n === 0 ? (
        <p className="muted small">아직 리뷰가 없어요. 구매 후 마이페이지에서 첫 리뷰를 남겨 주세요.</p>
      ) : (
        <>
          <div className="reviews-summary">
            <div className="reviews-avg">
              <b>{avg.toFixed(1)}</b>
              <span className="stars">{stars(Math.round(avg))}</span>
            </div>
            {!adult && (
              <div className="feel-bars">
                {feelStats(reviews).map((f) => (
                  <div key={f.key} className="feel-bar">
                    <span>{f.label}</span>
                    <i><em style={{ width: `${f.pct}%` }} /></i>
                    <span className="small muted">{f.pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!adult && loaded && (
            profile?.height ? (
              similar.length > 0 ? (
                <button type="button" className="similar-card" onClick={() => pick("similar")}>
                  <b>나와 비슷한 체형 {similar.length}명</b>
                  <span className="small">
                    키 {profile.height}cm·{profile.weight}kg 기준 ±{SIMILAR_CM}cm·±{SIMILAR_KG}kg
                    {simTop && <> · 주로 <b>{simTop}</b> 구매</>}
                    {simFit && simFit.pct > 0 && <> · {simFit.label} {simFit.pct}%</>}
                  </span>
                </button>
              ) : (
                <p className="similar-card small muted">아직 나와 비슷한 체형(±{SIMILAR_CM}cm·±{SIMILAR_KG}kg)의 리뷰가 없어요.</p>
              )
            ) : (
              <Link href={`/style-quiz?next=/product/${slug}%23reviews`} className="similar-card">
                <b>나와 비슷한 체형 리뷰만 보기</b>
                <span className="small">1분 스타일 진단을 하면 키·몸무게가 비슷한 분들의 후기를 골라 드려요 →</span>
              </Link>
            )
          )}

          <div className="review-tabs">
            <button type="button" className={tab === "all" ? "on" : ""} onClick={() => pick("all")}>전체 {n}</button>
            {!adult && profile?.height ? (
              <button type="button" className={tab === "similar" ? "on" : ""} onClick={() => pick("similar")}>나와 비슷한 체형 {similar.length}</button>
            ) : null}
            <button type="button" className={tab === "photo" ? "on" : ""} onClick={() => pick("photo")}>사진 {photoList.length}</button>
          </div>

          {list.length === 0 ? (
            <p className="muted small">해당하는 리뷰가 없어요.</p>
          ) : (
            <ul className="review-list">
              {list.slice(0, shown).map((r) => (
                <li key={r.id} className="review">
                  <div className="row between">
                    <span><span className="stars">{stars(r.rating)}</span> <b className="small">{r.authorName}</b></span>
                    <span className="small muted">{r.date}</span>
                  </div>
                  <div className="review-meta small">
                    {!adult && r.height > 0 && <span>{r.height}cm{r.weight ? ` · ${r.weight}kg` : ""}{r.bodyType ? ` · ${labelOf(BODY_TYPES, r.bodyType)}` : ""}</span>}
                    {r.option && <span>{r.option} 구매</span>}
                    {!adult && r.sizeFeel && <span className="feel">{labelOf(SIZE_FEELS, r.sizeFeel)}</span>}
                  </div>
                  <p className="review-text">{r.content}</p>
                  {r.photos.length > 0 && (
                    <div className="review-photos">
                      {r.photos.map((u) => (
                        <a key={u} href={u} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u} alt="리뷰 사진" loading="lazy" />
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {list.length > shown && (
            <button type="button" className="btn outline" style={{ width: "100%" }} onClick={() => setShown((s) => s + PAGE)}>
              리뷰 더 보기 ({list.length - shown})
            </button>
          )}
        </>
      )}
    </section>
  );
}
