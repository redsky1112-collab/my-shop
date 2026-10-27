import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { won } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/site";
import { updateOrder } from "../../actions";

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
              <td>{o.orderNo}<br /><span className="muted small">{o.createdAt.toLocaleString("ko-KR")}</span></td>
              <td>{o.items.map((i) => <div key={i.id}>{i.name}{i.option && ` (${i.option})`} × {i.quantity}</div>)}{o.hasAdult && <span className="r19-mini">19</span>}</td>
              <td>{won(o.total)}</td>
              <td>{o.recipient} {o.phone}<br /><span className="small">[{o.zipcode}] {o.address1} {o.address2}</span>{o.memo && <div className="muted small">메모: {o.memo}</div>}</td>
              <td>
                <form action={updateOrder} className="inline-form">
                  <input type="hidden" name="id" value={o.id} />
                  <select name="status" defaultValue={o.status}>
                    {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input name="trackingNo" placeholder="송장번호" defaultValue={o.trackingNo ?? ""} />
                  <button className="btn small">저장</button>
                </form>
              </td>
            </tr>
          ))}
          {orders.length === 0 && <tr><td colSpan={5} className="muted">주문이 없어요.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
