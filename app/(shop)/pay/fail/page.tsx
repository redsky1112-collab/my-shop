import Link from "next/link";

export default async function PayFail({ searchParams }: { searchParams: Promise<{ message?: string; orderNo?: string }> }) {
  const { message, orderNo } = await searchParams;
  return (
    <div className="empty">
      <h1 className="page-title">결제에 실패했어요</h1>
      <p className="muted">{message || "결제가 취소되었거나 오류가 발생했어요."}</p>
      <div className="row center">
        {orderNo && <Link className="btn" href={`/pay/${orderNo}`}>다시 결제하기</Link>}
        <Link className="btn outline" href="/cart">장바구니로</Link>
      </div>
    </div>
  );
}
