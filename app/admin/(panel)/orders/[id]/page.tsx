import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { won } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/site";
import RefundForm from "./RefundForm";

export default async function OrderDetail({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { done } = await searchParams;
  const o = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: { items: true, refunds: { orderBy: { createdAt: "desc" } } },
  });
  if (!o) notFound();
  const balance = o.total - o.refundedAmount;
  const paid = !!o.paymentKey && o.status !== "PENDING";

  return (
    <>
      <Link href="/admin/orders" className="link">← 주문 목록</Link>
      <h1 className="page-title">주문 {o.orderNo}</h1>
      {done && <p className="form-ok">{Number(done) > 0 ? `${won(Number(done))} 환불 완료` : "주문을 취소했어요."}</p>}

      <div className="summary">
        <div><span>상태</span><b>{ORDER_STATUS[o.status]}{o.refundedAmount > 0 && o.status !== "CANCELED" && " (부분 취소)"}</b></div>
        <div><span>주문자</span><span>{o.buyerName} {o.buyerPhone}</span></div>
        <div><span>결제일</span><span>{o.paidAt ? o.paidAt.toLocaleString("ko-KR") : "결제 전"}</span></div>
        <div><span>상품</span><span>{won(o.itemsTotal)}</span></div>
        <div><span>배송비</span><span>{won(o.shippingFee)}{o.shippingRefunded && " (환불됨)"}</span></div>
        {o.giftWrap && <div><span>선물 포장</span><span>{won(o.giftFee)}</span></div>}
        <div className="total"><span>결제금액</span><span>{won(o.total)}</span></div>
        {o.refundedAmount > 0 && <div><span>환불한 금액</span><b className="out">− {won(o.refundedAmount)}</b></div>}
        {o.refundedAmount > 0 && <div><span>남은 결제금액</span><b>{won(balance)}</b></div>}
      </div>

      {o.status !== "CANCELED" && (
        <RefundForm
          orderId={o.id}
          paid={paid}
          balance={balance}
          shippingFee={o.shippingRefunded ? 0 : o.shippingFee}
          items={o.items.map((i) => ({
            id: i.id, name: i.name, option: i.option, price: i.price, quantity: i.quantity, remain: i.quantity - i.canceledQty,
          }))}
        />
      )}

      <h3>환불 기록</h3>
      {o.refunds.length === 0 ? <p className="muted small">아직 없어요.</p> : (
        <table className="table">
          <thead><tr><th>일시</th><th>금액</th><th>내용</th><th>사유</th><th>재고</th><th>요청</th></tr></thead>
          <tbody>
            {o.refunds.map((r) => (
              <tr key={r.id}>
                <td>{r.createdAt.toLocaleString("ko-KR")}</td>
                <td>{won(r.amount)}</td>
                <td>{r.detail}</td>
                <td>{r.reason}</td>
                <td>{r.restocked ? "복구" : "복구 안 함"}</td>
                <td>{r.by === "customer" ? "고객" : "관리자"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
