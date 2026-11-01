import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/user";
import { reviewable } from "@/lib/reviews";
import type { StyleProfile } from "@/lib/style";
import ReviewForm from "./ReviewForm";

export const metadata = { title: "리뷰 쓰기" };

export default async function ReviewPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const user = await getUser();
  if (!user) redirect(`/login?next=/review/${itemId}`);
  const item = await prisma.orderItem.findUnique({
    where: { id: Math.floor(Number(itemId)) || 0 },
    include: { order: true, product: { select: { slug: true, imageUrl: true } }, review: { select: { id: true } } },
  });
  if (!item || item.order.userId !== user.id) notFound();

  if (item.review || !reviewable(item.order, item)) {
    return (
      <div className="empty">
        <p>{item.review ? "이미 리뷰를 쓴 상품이에요. 감사합니다!" : "배송완료된 상품만 리뷰를 쓸 수 있어요."}</p>
        <Link href="/mypage" className="btn outline">마이페이지로</Link>
      </div>
    );
  }

  let profile: Partial<StyleProfile> = {};
  try { profile = user.styleProfile ? JSON.parse(user.styleProfile) : {}; } catch {}

  return (
    <div className="review-write">
      <h1 className="page-title">리뷰 쓰기</h1>
      <div className="review-item">
        {item.product.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.product.imageUrl} alt="" />
        )}
        <div>
          <b>{item.name}</b>
          {item.option && <div className="small muted">구매 옵션: {item.option}</div>}
        </div>
      </div>
      <ReviewForm
        itemId={item.id}
        body={{
          gender: profile.gender === "M" || profile.gender === "F" ? profile.gender : "",
          height: profile.height || 0,
          weight: profile.weight || 0,
          bodyType: profile.bodyType || "",
        }}
      />
    </div>
  );
}
