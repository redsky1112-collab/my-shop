import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { won } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/site";
import ClearCart from "./ClearCart";

export default async function Complete({
  params,
  searchParams,
}: {
  params: Promise<{ orderNo: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { orderNo } = await params;
  const { paid } = await searchParams;
  const o = await prisma.order.findUnique({ where: { orderNo } });
  if (!o) notFound();
  // 개인정보(주소·연락처)는 여기서 노출하지 않음. 상세는 주문조회에서 휴대폰 번호 확인 후
  return (
    <div className="empty">
      {paid && o.status === "PAID" && <ClearCart />}
      <h1 className="page-title">{o.status === "PAID" ? "주문이 완료되었어요" : `주문 상태: ${ORDER_STATUS[o.status]}`}</h1>
      <div className="summary">
        <div><span>주문번호</span><b>{o.orderNo}</b></div>
        <div><span>결제금액</span><span>{won(o.total)}</span></div>
      </div>
      <p className="muted">주문번호는 주문조회 때 필요해요.</p>
      <div className="row center">
        <Link className="btn" href="/order/lookup">주문조회</Link>
        <Link className="btn outline" href="/">계속 쇼핑하기</Link>
      </div>
    </div>
  );
}
