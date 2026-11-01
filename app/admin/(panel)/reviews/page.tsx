import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { toggleReview } from "../../actions";
import { BODY_TYPES, labelOf } from "@/lib/style";
import { SIZE_FEELS } from "@/lib/reviews";

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ hidden?: string }> }) {
  await requireAdmin();
  const onlyHidden = (await searchParams).hidden === "1";
  const list = await prisma.review.findMany({
    where: onlyHidden ? { hidden: true } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { product: { select: { name: true, slug: true } } },
  });
  const [total, low] = await Promise.all([
    prisma.review.count(),
    prisma.review.count({ where: { rating: { lte: 2 }, hidden: false } }),
  ]);

  return (
    <>
      <div className="row between">
        <h1 className="page-title">리뷰</h1>
        <span className="small muted">전체 {total}개 · 별점 2점 이하 {low}개</span>
      </div>
      <div className="row" style={{ gap: 14, justifyContent: "flex-start", marginBottom: 12 }}>
        <Link href="/admin/reviews" className={onlyHidden ? "link" : ""}>{onlyHidden ? "전체" : <b>전체</b>}</Link>
        <Link href="/admin/reviews?hidden=1" className={onlyHidden ? "" : "link"}>{onlyHidden ? <b>숨긴 리뷰</b> : "숨긴 리뷰"}</Link>
      </div>
      {list.length === 0 ? (
        <p className="muted">리뷰가 없어요.</p>
      ) : (
        <ul className="review-list">
          {list.map((r) => (
            <li key={r.id} className={`review${r.hidden ? " off" : ""}`}>
              <div className="row between">
                <span>
                  <span className="stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>{" "}
                  <b className="small">{r.authorName}</b>
                  {r.hidden && <span className="small out"> · 숨김</span>}
                </span>
                <span className="small muted">{r.createdAt.toLocaleDateString("ko-KR")}</span>
              </div>
              <Link href={`/product/${r.product.slug}#reviews`} target="_blank" className="small link">{r.product.name}</Link>
              <div className="review-meta small">
                {r.option && <span>{r.option} 구매</span>}
                {r.sizeFeel && <span className="feel">{labelOf(SIZE_FEELS, r.sizeFeel)}</span>}
                {r.height > 0 && <span>{r.height}cm{r.weight ? ` · ${r.weight}kg` : ""}{r.bodyType ? ` · ${labelOf(BODY_TYPES, r.bodyType)}` : ""}</span>}
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
              <form action={toggleReview}>
                <input type="hidden" name="id" value={r.id} />
                <button className="btn small outline">{r.hidden ? "다시 보이기" : "숨기기"}</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
