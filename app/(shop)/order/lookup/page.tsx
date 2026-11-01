import { prisma } from "@/lib/db";
import { onlyDigits, won } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/site";
import CancelButton from "../CancelButton";
import { customerCancelable } from "@/lib/refund";
import { CLAIM_STATUS, CLAIM_TYPES, claimWindow } from "@/lib/claims";
import Link from "next/link";

export default async function Lookup({ searchParams }: { searchParams: Promise<{ orderNo?: string; phone?: string; canceled?: string; claimed?: string }> }) {
  const sp = await searchParams;
  const orderNo = (sp.orderNo || "").trim();
  const phone = onlyDigits(sp.phone || "");
  const o =
    orderNo && phone
      ? await prisma.order.findFirst({ where: { orderNo, buyerPhone: phone }, include: { items: true, claims: { orderBy: { createdAt: "desc" } } } })
      : null;

  return (
    <>
      <h1 className="page-title">비회원 주문조회</h1>
      <form className="form" method="get">
        <input name="orderNo" required placeholder="주문번호" defaultValue={orderNo} />
        <input name="phone" required placeholder="주문자 휴대폰" inputMode="numeric" defaultValue={sp.phone} />
        <button className="btn block">조회</button>
      </form>
      {orderNo && phone && !o && <p className="error">일치하는 주문이 없어요.</p>}
      {o && (
        <div className="summary">
          <div><span>상태</span><b>{ORDER_STATUS[o.status]}</b></div>
          {o.items.map((i) => (
            <div key={i.id}>
              <span>{i.name}{i.option && ` (${i.option})`} × {i.quantity}{i.canceledQty > 0 && <span className="out small"> (취소 {i.canceledQty})</span>}</span>
              <span>{won(i.price * i.quantity)}</span>
            </div>
          ))}
          <div><span>배송비</span><span>{won(o.shippingFee)}</span></div>
          {o.giftWrap && <div><span>선물 포장</span><span>{won(o.giftFee)}</span></div>}
          <div className="total"><span>결제금액</span><span>{won(o.total)}</span></div>
          {o.refundedAmount > 0 && <div><span>환불 금액</span><b className="out">{won(o.refundedAmount)}</b></div>}
          <div><span>받는 분</span><span>{o.recipient}</span></div>
          <div><span>주소</span><span>{o.address1} {o.address2}</span></div>
          {o.trackingNo && <div><span>송장번호</span><span>{o.trackingNo}</span></div>}
        </div>
      )}
      {sp.canceled && <p className="form-ok">주문을 취소했어요. 결제 수단으로 환불돼요.</p>}
      {o && customerCancelable(o) && <CancelButton orderNo={o.orderNo} phone={phone} paid={o.status === "PAID"} />}
      {sp.claimed && <p className="form-ok">교환·반품 신청을 접수했어요. 확인 후 안내해 드릴게요.</p>}
      {o?.claims.map((c) => (
        <p key={c.id} className="claim-line small">
          {CLAIM_TYPES[c.type as "RETURN" | "EXCHANGE"]} 신청 · <b>{CLAIM_STATUS[c.status]}</b>
          {c.adminMemo && <span className="muted"> — {c.adminMemo}</span>}
        </p>
      ))}
      {o && claimWindow(o).ok && <Link href={`/order/claim/${o.orderNo}?phone=${phone}`} className="btn outline block">교환·반품 신청</Link>}
    </>
  );
}
