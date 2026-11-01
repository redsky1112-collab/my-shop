import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/user";
import { won } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/site";
import { logout, setMarketing, withdraw } from "../login/actions";
import CancelButton from "../order/CancelButton";
import { customerCancelable } from "@/lib/refund";
import { CLAIM_STATUS, CLAIM_TYPES, claimWindow } from "@/lib/claims";
import { reviewable } from "@/lib/reviews";
import { availableFor } from "@/lib/stock";
import { cancelRestock } from "../restock/actions";
import TrackLink from "@/components/TrackLink";

const PROVIDER_LABEL: Record<string, string> = { kakao: "카카오", naver: "네이버", demo: "테스트" };

export default async function MyPage({ searchParams }: { searchParams: Promise<{ canceled?: string; claimed?: string; reviewed?: string }> }) {
  const { canceled, claimed, reviewed } = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login?next=/mypage");

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: { include: { review: { select: { id: true } } } }, claims: { orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const alerts = await prisma.restockAlert.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { product: { include: { variants: true } } },
  });

  return (
    <>
      <h1 className="page-title">마이페이지</h1>
      <div className="summary">
        <div><span>이름</span><b>{user.name || "회원"}</b></div>
        <div><span>로그인</span><span>{PROVIDER_LABEL[user.provider] || user.provider}</span></div>
        {user.email && <div><span>이메일</span><span>{user.email}</span></div>}
        <div><span>가입일</span><span>{user.createdAt.toLocaleDateString("ko-KR")}</span></div>
        <div>
          <span>소식 받기</span>
          <form action={setMarketing}>
            <input type="hidden" name="on" value={user.marketingAgree ? "0" : "1"} />
            <span>{user.marketingAgree ? "받는 중 · " : "안 받음 · "}</span>
            <button className="link" style={{ background: "none", border: 0, padding: 0 }}>{user.marketingAgree ? "그만 받기" : "받기"}</button>
          </form>
        </div>
        <div>
          <span>스타일 진단</span>
          {user.styleProfile
            ? <span><Link href="/for-you" className="link">맞춤 추천 보기</Link> · <Link href="/style-quiz?next=/mypage" className="link">다시 진단</Link></span>
            : <Link href="/style-quiz?next=/for-you" className="link">진단하기 (1분)</Link>}
        </div>
      </div>

      {canceled && <p className="form-ok">주문을 취소했어요. 결제 수단으로 환불돼요.</p>}
      {claimed && <p className="form-ok">교환·반품 신청을 접수했어요. 확인 후 안내해 드릴게요.</p>}
      {reviewed && <p className="form-ok">리뷰를 등록했어요. 소중한 후기 감사합니다!</p>}
      <h3>주문 내역</h3>
      {orders.length === 0 ? (
        <p className="muted">아직 주문이 없어요. <Link href="/" className="link">쇼핑하러 가기</Link></p>
      ) : (
        <div className="my-orders">
          {orders.map((o) => (
            <div key={o.id} className="my-order">
              <div className="row between">
                <span className="small muted">{o.createdAt.toLocaleDateString("ko-KR")} · {o.orderNo}</span>
                <b>{ORDER_STATUS[o.status]}</b>
              </div>
              <div>{o.items[0]?.name}{o.items.length > 1 && ` 외 ${o.items.length - 1}건`}</div>
              <div className="row between">
                <span />
                <b>{won(o.total)}</b>
              </div>
              {o.refundedAmount > 0 && <div className="small out">환불 {won(o.refundedAmount)}</div>}
              {o.status !== "CANCELED" && <TrackLink courier={o.courier} trackingNo={o.trackingNo} />}
              {customerCancelable(o) && <CancelButton orderNo={o.orderNo} paid={o.status === "PAID"} />}
              {o.claims.map((c) => (
                <div key={c.id} className="claim-line small">
                  {CLAIM_TYPES[c.type as "RETURN" | "EXCHANGE"]} 신청 · <b>{CLAIM_STATUS[c.status]}</b>
                  {c.adminMemo && <span className="muted"> — {c.adminMemo}</span>}
                  {c.resendTrackingNo && <TrackLink courier={o.courier} trackingNo={c.resendTrackingNo} label="교환 상품 조회" />}
                </div>
              ))}
              {o.items.filter((it) => reviewable(o, it)).map((it) => (
                <div key={it.id} className="review-line small">
                  <span>{it.name}{it.option && ` (${it.option})`}</span>
                  {it.review
                    ? <span className="muted">리뷰 작성 완료</span>
                    : <Link href={`/review/${it.id}`} className="btn small outline">리뷰 쓰기</Link>}
                </div>
              ))}
              {claimWindow(o).ok && <Link href={`/order/claim/${o.orderNo}`} className="link small">교환·반품 신청</Link>}
              {o.status === "PENDING" && (
                <Link href={`/pay/${o.orderNo}`} className="btn small outline">결제하기</Link>
              )}
            </div>
          ))}
        </div>
      )}

      {alerts.length > 0 && (
        <>
          <h3>재입고 알림 신청</h3>
          <div className="my-orders">
            {alerts.map((a) => {
              const back = a.product.active && availableFor(a.product, a.option) > 0;
              return (
                <div key={a.id} className="restock-line">
                  <Link href={`/product/${a.product.slug}`} className="grow">{a.product.name}{a.option && ` (${a.option})`}</Link>
                  {back
                    ? <Link href={`/product/${a.product.slug}`} className="btn small">입고됐어요 · 구매하기</Link>
                    : <span className="small muted">{a.notifiedAt ? "알림 보냄" : "입고 대기 중"}</span>}
                  {!back && (
                    <form action={cancelRestock}><input type="hidden" name="id" value={a.id} /><button className="link small">취소</button></form>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="row between" style={{ marginTop: 40 }}>
        <form action={logout}><button className="btn outline small">로그아웃</button></form>
        <details className="withdraw">
          <summary className="link">회원 탈퇴</summary>
          <form action={withdraw} className="form" style={{ marginTop: 10 }}>
            <p className="small muted">회원 정보가 삭제돼요. 주문 기록은 전자상거래법에 따라 일정 기간 보관돼요.</p>
            <label className="check"><input type="checkbox" required /> 위 내용을 확인했어요</label>
            <button className="btn small">탈퇴하기</button>
          </form>
        </details>
      </div>
    </>
  );
}
