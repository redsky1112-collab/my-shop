import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { won } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/site";
import { updateOrder } from "../../actions";
import { COURIERS, DEFAULT_COURIER, trackUrl } from "@/lib/couriers";

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const where = status && ORDER_STATUS[status] ? { status } : { status: { not: "PENDING" } };
  const orders = await prisma.order.findMany({ where, include: { items: true }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <h1 className="page-title">주문</h1>
      <nav className="tabs">
        <Link href="/admin/orders">전체(결제대기 제외)</Link>
        {Object.entries(ORDER_STATUS).map(([k, v]) => <Link key={k} href={`/admin/orders?status=${k}`}>{v}</Link>)}
      </nav>
      <table className="table">
        <thead><tr><th>주문번호/일시</th><th>상품</th><th>금액</th><th>받는 분/주소</th><th>상태·송장</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td><Link href={`/admin/orders/${o.id}`}>{o.orderNo}</Link><br /><span className="muted small">{o.createdAt.toLocaleString("ko-KR")}</span></td>
              <td>{o.items.map((i) => <div key={i.id}>{i.name}{i.option && ` (${i.option})`} × {i.quantity}</div>)}{o.hasAdult && <span className="r19-mini">19</span>}{o.giftWrap && <div className="gift-tag small">🎁 선물 포장{o.giftMessage && `: “${o.giftMessage}”`}</div>}</td>
              <td>
                {won(o.total)}
                {o.refundedAmount > 0 && <div className="small out">환불 {won(o.refundedAmount)}</div>}
                {o.status !== "CANCELED" && <div><Link href={`/admin/orders/${o.id}`} className="link">취소·환불</Link></div>}
              </td>
              <td>{o.recipient} {o.phone}<br /><span className="small">[{o.zipcode}] {o.address1} {o.address2}</span>{o.memo && <div className="muted small">메모: {o.memo}</div>}</td>
              <td>
                <form action={updateOrder} className="inline-form">
                  <input type="hidden" name="id" value={o.id} />
                  <select name="status" defaultValue={o.status}>
                    {Object.entries(ORDER_STATUS)
                      .filter(([k]) => k !== "CANCELED" || o.status === "CANCELED" || o.status === "PENDING")
                      .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select name="courier" defaultValue={o.courier || DEFAULT_COURIER} aria-label="택배사">
                    {COURIERS.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
                  </select>
                  <input name="trackingNo" placeholder="송장번호 (입력하면 배송중)" defaultValue={o.trackingNo ?? ""} inputMode="numeric" />
                  <button className="btn small">저장</button>
                </form>
                {o.trackingNo && <a href={trackUrl(o.courier, o.trackingNo)} target="_blank" rel="noopener noreferrer" className="link small">조회</a>}
              </td>
            </tr>
          ))}
          {orders.length === 0 && <tr><td colSpan={5} className="muted">주문이 없어요.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
