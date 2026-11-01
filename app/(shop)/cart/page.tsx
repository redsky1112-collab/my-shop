"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import Thumb from "@/components/Thumb";
import { won, shippingFor } from "@/lib/format";
import { SHIPPING } from "@/lib/site";
import { FIRST_COUPON } from "@/lib/coupon";

export default function CartPage() {
  const { items, setQty, remove } = useCart();
  const itemsTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const ship = shippingFor(itemsTotal, SHIPPING.fee, SHIPPING.freeOver);

  if (items.length === 0)
    return (
      <div className="empty">
        <p>장바구니가 비어 있어요.</p>
        <Link href="/" className="btn">쇼핑하러 가기</Link>
      </div>
    );

  return (
    <>
      <h1 className="page-title">장바구니</h1>
      <ul className="cart-list">
        {items.map((i) => (
          <li key={`${i.productId}-${i.option}`} className="cart-item">
            <Thumb src={i.imageUrl} alt={i.name} />
            <div className="grow">
              <Link href={`/product/${i.slug}`}>{i.name}</Link>
              {i.option && <div className="muted">옵션: {i.option}</div>}
              <div className="qty">
                <button onClick={() => setQty(i.productId, i.option, i.quantity - 1)}>-</button>
                <span>{i.quantity}</span>
                <button onClick={() => setQty(i.productId, i.option, i.quantity + 1)}>+</button>
              </div>
            </div>
            <div className="right">
              <b>{won(i.price * i.quantity)}</b>
              <button className="link" onClick={() => remove(i.productId, i.option)}>삭제</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="summary">
        <div><span>상품금액</span><span>{won(itemsTotal)}</span></div>
        <div><span>배송비</span><span>{ship ? won(ship) : "무료"}</span></div>
        <div className="total"><span>결제예정금액</span><span>{won(itemsTotal + ship)}</span></div>
        <p className="small muted" style={{ margin: 0 }}>첫 구매라면 주문서에서 {FIRST_COUPON.name}이 자동 적용돼요 (회원, {won(FIRST_COUPON.minItems)} 이상).</p>
        <Link href="/checkout" className="btn block">주문하기</Link>
      </div>
    </>
  );
}
