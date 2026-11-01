"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { useStyleProfile } from "@/components/useStyleProfile";
import Thumb from "@/components/Thumb";
import { recommendSize } from "@/lib/recommend";
import { splitTags } from "@/lib/style";
import { won } from "@/lib/format";

type Item = {
  productId: number; slug: string; name: string; price: number; imageUrl: string | null;
  options: string; fit: string; stock: number; category: string;
  optionStock: Record<string, number> | null;
};

export default function LookBuy({ items }: { items: Item[] }) {
  const { add } = useCart();
  const router = useRouter();
  const { profile, loaded } = useStyleProfile();
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(items.map((i) => [i.productId, i.stock > 0]))
  );
  const [err, setErr] = useState("");

  // 진단 결과가 있으면 추천 사이즈로 미리 채움
  useEffect(() => {
    if (!loaded || !profile) return;
    const init: Record<number, string> = {};
    for (const i of items) {
      const r = recommendSize(i, profile);
      // 추천 사이즈가 품절이면 자동으로 채우지 않음
      if (r && (!i.optionStock || (i.optionStock[r.size] ?? 0) > 0)) init[i.productId] = r.size;
    }
    setPicked((p) => ({ ...init, ...p }));
  }, [loaded, profile, items]);

  const chosen = items.filter((i) => checked[i.productId]);
  const total = chosen.reduce((s, i) => s + i.price, 0);

  const addAll = () => {
    setErr("");
    const missing = chosen.find((i) => splitTags(i.options).length > 0 && !picked[i.productId]);
    if (missing) return setErr(`${missing.name}의 사이즈를 골라 주세요.`);
    if (!chosen.length) return setErr("담을 상품을 선택해 주세요.");
    for (const i of chosen) {
      add({
        productId: i.productId, slug: i.slug, name: i.name, price: i.price,
        option: picked[i.productId] || "", quantity: 1, adultOnly: false, imageUrl: i.imageUrl,
      });
    }
    router.push("/cart");
  };

  return (
    <div className="look-buy">
      {!profile && loaded && (
        <Link href="/style-quiz" className="size-advice ghost">진단하면 사이즈가 자동으로 채워져요 →</Link>
      )}
      <ul className="cart-list">
        {items.map((i) => {
          const opts = splitTags(i.options);
          const soldout = i.stock <= 0;
          return (
            <li key={i.productId} className="cart-item">
              <input type="checkbox" disabled={soldout} checked={!!checked[i.productId]}
                onChange={(e) => setChecked({ ...checked, [i.productId]: e.target.checked })} />
              <Thumb src={i.imageUrl} alt={i.name} />
              <div className="grow">
                <span className="muted small">{i.category}</span>
                <Link href={`/product/${i.slug}`}>{i.name}</Link>
                <b>{won(i.price)}</b>
                {soldout ? <span className="muted small">품절</span> : opts.length > 0 && (
                  <select value={picked[i.productId] || ""} onChange={(e) => setPicked({ ...picked, [i.productId]: e.target.value })}>
                    <option value="">사이즈</option>
                    {opts.map((o) => {
                      const n = i.optionStock ? i.optionStock[o] ?? 0 : i.stock;
                      return <option key={o} value={o} disabled={n <= 0}>{o}{n <= 0 ? " (품절)" : n <= 3 ? ` (${n}개 남음)` : ""}</option>;
                    })}
                  </select>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="summary">
        <div className="total"><span>선택 {chosen.length}벌</span><span>{won(total)}</span></div>
      </div>
      {err && <p className="error">{err}</p>}
      <button className="btn block" onClick={addAll}>코디 한번에 담기</button>
    </div>
  );
}
