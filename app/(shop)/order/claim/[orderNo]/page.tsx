import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/user";
import { onlyDigits, won } from "@/lib/format";
import { claimableQty, claimWindow, returnFee, BUYER_DAYS, SELLER_DAYS } from "@/lib/claims";
import ClaimForm from "./ClaimForm";

export const metadata = { title: "교환·반품 신청" };

export default async function ClaimPage({
  params, searchParams,
}: { params: Promise<{ orderNo: string }>; searchParams: Promise<{ phone?: string }> }) {
  const { orderNo } = await params;
  const phone = onlyDigits((await searchParams).phone || "");
  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { items: { include: { product: { include: { variants: { orderBy: { sort: "asc" } } } } } }, claims: true },
  });
  if (!order) notFound();
  const user = await getUser();
  const owner = (user && order.userId === user.id) || (!!phone && phone === order.buyerPhone);
  if (!owner) {
    return (
      <div className="empty">
        <p>본인 주문만 신청할 수 있어요.</p>
        <Link href="/order/lookup" className="btn outline">비회원 주문조회</Link>
      </div>
    );
  }

  const win = claimWindow(order);
  const left = claimableQty(order, order.claims);
  const items = order.items
    .map((i) => {
      const opts = i.product.options.split(",").map((s) => s.trim()).filter(Boolean);
      return {
        id: i.id, name: i.name, option: i.option, price: i.price, max: left.get(i.id) ?? 0,
        options: opts.map((o) => ({
          option: o,
          stock: i.product.variants.length ? i.product.variants.find((v) => v.option === o)?.stock ?? 0 : i.product.stock,
        })),
      };
    })
    .filter((i) => i.max > 0);

  return (
    <div className="claim">
      <h1 className="page-title">교환·반품 신청</h1>
      <p className="muted small">주문번호 {order.orderNo}</p>
      {!win.ok || items.length === 0 ? (
        <p className="error">
          {order.status !== "SHIPPING" && order.status !== "DELIVERED"
            ? "배송이 시작된 주문부터 신청할 수 있어요. 배송 전이면 주문 취소를 이용해 주세요."
            : items.length === 0 ? "신청할 수 있는 상품이 남아 있지 않아요." : "신청 기간이 지났어요. 고객센터로 문의해 주세요."}
        </p>
      ) : (
        <>
          <div className="claim-notice small">
            <p>· 단순 변심·사이즈 사유: 받은 날부터 {BUYER_DAYS}일 이내, 반품 배송비 <b>{won(returnFee(order.shippingFee))}</b>은 고객 부담이에요 (환불금에서 차감{order.shippingFee === 0 ? ", 무료배송 주문은 왕복" : ""}).</p>
            <p>· 불량·오배송·상품 차이: 받은 날부터 {SELLER_DAYS}일 이내, 배송비는 저희가 부담해요. 사진을 꼭 올려 주세요.</p>
            <p>· 착용 흔적·세탁·택 제거로 상품 가치가 떨어지면 교환·반품이 어려울 수 있어요.</p>
            {order.hasAdult && <p>· PRIVATE DIALOGUE 상품은 위생상 개봉·사용 후에는 교환·반품이 어려워요 (불량 제외).</p>}
          </div>
          <ClaimForm orderNo={order.orderNo} phone={phone} items={items} buyerOk={win.buyerOk} />
        </>
      )}
    </div>
  );
}
