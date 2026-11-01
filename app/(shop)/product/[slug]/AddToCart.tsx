"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, CartItem } from "@/components/CartProvider";
import SizeAdvice from "@/components/SizeAdvice";

export default function AddToCart({
  item,
  options,
  stock,
  optionStock = null,
  fit = "",
}: {
  item: Omit<CartItem, "option" | "quantity">;
  options: string[];
  stock: number;
  optionStock?: Record<string, number> | null;
  fit?: string;
}) {
  const { add } = useCart();
  const router = useRouter();
  const [option, setOption] = useState("");
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState("");

  if (stock <= 0) return <button className="btn" disabled>품절</button>;

  // 선택한 옵션의 남은 수량 (사이즈별 재고가 없으면 상품 재고)
  const left = (o: string) => (optionStock ? optionStock[o] ?? 0 : stock);
  const max = option ? left(option) : stock;
  const pick = (o: string) => {
    setOption(o);
    setMsg(o && left(o) <= 0 ? `${o} 사이즈는 품절이에요.` : "");
    setQty((q) => Math.max(1, Math.min(q, Math.max(1, left(o)))));
  };

  const go = (toCart: boolean) => {
    if (options.length && !option) return setMsg("옵션을 선택해 주세요.");
    if (option && left(option) <= 0) return setMsg(`${option} 사이즈는 품절이에요.`);
    add({ ...item, option, quantity: qty });
    if (toCart) router.push("/cart");
    else setMsg("장바구니에 담았어요.");
  };

  return (
    <div className="buy">
      {options.length > 0 && !item.adultOnly && (
        <SizeAdvice options={options.join(",")} fit={fit} optionStock={optionStock} onPick={pick} />
      )}
      {options.length > 0 && (
        <div className="size-chips" role="radiogroup" aria-label="사이즈 선택">
          {options.map((o) => {
            const n = left(o);
            return (
              <button type="button" key={o} role="radio" aria-checked={option === o} disabled={n <= 0}
                className={`size-chip${option === o ? " on" : ""}${n <= 0 ? " out" : ""}`} onClick={() => pick(o)}>
                {o}
                {n <= 0 ? <small>품절</small> : n <= 3 ? <small>{n}개 남음</small> : null}
              </button>
            );
          })}
        </div>
      )}
      <div className="qty">
        <button onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
        <span>{qty}</span>
        <button onClick={() => setQty(Math.min(Math.max(1, max), qty + 1))}>+</button>
      </div>
      <div className="row">
        <button className="btn outline" onClick={() => go(false)}>장바구니</button>
        <button className="btn" onClick={() => go(true)}>바로 구매</button>
      </div>
      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}
