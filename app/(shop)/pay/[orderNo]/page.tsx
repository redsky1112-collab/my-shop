import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { won } from "@/lib/format";
import PaymentWidget from "./PaymentWidget";

export default async function PayPage({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;
  const o = await prisma.order.findUnique({ where: { orderNo } });
  if (!o) notFound();
  if (o.status !== "PENDING") redirect(`/order/complete/${o.orderNo}`);

  return (
    <>
      <h1 className="page-title">결제</h1>
      <div className="summary">
        <div><span>주문번호</span><span>{o.orderNo}</span></div>
        <div><span>주문명</span><span>{o.orderName}</span></div>
        {o.giftWrap && <div><span>선물 포장</span><span>{won(o.giftFee)}</span></div>}
        {o.discount > 0 && <div><span>{o.couponName || "쿠폰 할인"}</span><span className="discount">− {won(o.discount)}</span></div>}
        <div className="total"><span>결제금액</span><span>{won(o.total)}</span></div>
      </div>
      <PaymentWidget
        clientKey={process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || ""}
        orderNo={o.orderNo}
        orderName={o.orderName}
        amount={o.total}
        customerName={o.buyerName}
        customerEmail={o.buyerEmail}
        customerMobilePhone={o.buyerPhone}
      />
    </>
  );
}
