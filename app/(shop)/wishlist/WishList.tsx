"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWish } from "@/components/WishProvider";
import WishButton from "@/components/WishButton";
import Thumb from "@/components/Thumb";
import { won } from "@/lib/format";

type Item = {
  id: number; slug: string; name: string; imageUrl: string | null; price: number; salePrice: number | null;
  stock: number; adult: boolean; masked: boolean;
};

export default function WishList() {
  const { ids, ready, member } = useWish();
  const [items, setItems] = useState<Item[] | null>(null);
  const key = ids.join(",");

  // 처음 한 번 목록을 불러오고, 하트를 꺼도 바로 사라지지 않게(실수로 누른 경우 되돌리기 쉽게) 화면에는 남겨 둠
  useEffect(() => {
    if (!ready || items !== null) return;
    if (!key) { setItems([]); return; }
    fetch(`/api/wishlist/items?ids=${key}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, [ready, key, items]);

  if (!ready || items === null) return <p className="muted">불러오는 중…</p>;

  return (
    <>
      {!member && (
        <p className="small muted wish-note">
          지금은 이 기기에만 저장돼요. <Link href="/login?next=/wishlist" className="link">로그인</Link>하면 다른 기기에서도 볼 수 있어요.
        </p>
      )}
      {items.length === 0 ? (
        <div className="empty">
          <p>아직 찜한 상품이 없어요. 마음에 드는 상품의 ♡를 눌러 보세요.</p>
          <Link href="/for-you" className="btn outline">맞춤 추천 보러 가기</Link>
        </div>
      ) : (
        <div className="grid">
          {items.map((p) => {
            const sale = p.salePrice && p.salePrice < p.price;
            const off = !ids.includes(p.id);
            return (
              <div key={p.id} className={`card-wrap${off ? " wish-off" : ""}`}>
                {p.masked ? (
                  <Link href={`/adult-verify?next=/wishlist`} className="card">
                    <Thumb alt="" masked />
                    <div className="card-body"><div className="card-name muted">성인인증 후 확인할 수 있어요</div></div>
                  </Link>
                ) : (
                  <Link href={`/product/${p.slug}`} className="card">
                    <Thumb src={p.imageUrl} alt={p.name} />
                    <div className="card-body">
                      <div className="card-name">{p.name}{p.adult && <span className="r19-mini">19</span>}</div>
                      <div className="card-price">
                        {sale ? (
                          <>
                            <span className="pct">{Math.round((1 - p.salePrice! / p.price) * 100)}%</span>
                            <b>{won(p.salePrice!)}</b>
                            <s className="muted">{won(p.price)}</s>
                          </>
                        ) : <b>{won(p.price)}</b>}
                      </div>
                      {p.stock <= 0 && <div className="soldout">품절</div>}
                    </div>
                  </Link>
                )}
                <WishButton productId={p.id} />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
