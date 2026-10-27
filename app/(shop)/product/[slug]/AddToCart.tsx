"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, CartItem } from "@/components/CartProvider";

export default function AddToCart({
  item,
  options,
  stock,
}: {
  item: Omit<CartItem, "option" | "quantity">;
  options: string[];
  stock: number;
}) {
  const { add } = useCart();
  const router = useRouter();
  const [option, setOption] = useState("");
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState("");

  if (stock <= 0) return <button className="btn" disabled>품절</button>;

  const go = (toCart: boolean) => {
    if (options.length && !option) return setMsg("옵션을 선택해 주세요.");
    add({ ...item, option, quantity: qty });
    if (toCart) router.push("/cart");
    else setMsg("장바구니에 담았어요.");
  };

  return (
    <div className="buy">
      {options.length > 0 && (
        <select value={option} onChange={(e) => setOption(e.target.value)}>
          <option value="">옵션 선택</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )}
      <div className="qty">
        <button onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
        <span>{qty}</span>
        <button onClick={() => setQty(Math.min(stock, qty + 1))}>+</button>
      </div>
      <div className="row">
        <button className="btn outline" onClick={() => go(false)}>장바구니</button>
        <button className="btn" onClick={() => go(true)}>바로 구매</button>
      </div>
      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}
