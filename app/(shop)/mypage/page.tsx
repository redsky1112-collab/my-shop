import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/user";
import { won } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/site";
import { logout, withdraw } from "../login/actions";

const PROVIDER_LABEL: Record<string, string> = { kakao: "카카오", naver: "네이버", demo: "테스트" };

export default async function MyPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/mypage");

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <h1 className="page-title">마이페이지</h1>
      <div className="summary">
        <div><span>이름</span><b>{user.name || "회원"}</b></div>
        <div><span>로그인</span><span>{PROVIDER_LABEL[user.provider] || user.provider}</span></div>
        {user.email && <div><span>이메일</span><span>{user.email}</span></div>}
        <div><span>가입일</span><span>{user.createdAt.toLocaleDateString("ko-KR")}</span></div>
      </div>

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
                <span className="small muted">{o.trackingNo ? `송장 ${o.trackingNo}` : ""}</span>
                <b>{won(o.total)}</b>
              </div>
              {o.status === "PENDING" && (
                <Link href={`/pay/${o.orderNo}`} className="btn small outline">결제하기</Link>
              )}
            </div>
          ))}
        </div>
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
