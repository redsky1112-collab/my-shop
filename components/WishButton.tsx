"use client";

import Link from "next/link";
import { useWish } from "./WishProvider";

/** 하트 찜 버튼. card = 상품 사진 위 작은 하트, detail = 상세 화면 "찜하기" 버튼 */
export default function WishButton({ productId, variant = "card" }: { productId: number; variant?: "card" | "detail" }) {
  const { has, toggle } = useWish();
  const on = has(productId);
  const label = on ? "찜 해제" : "찜하기";
  return (
    <button
      type="button"
      className={`wish-btn ${variant}${on ? " on" : ""}`}
      aria-pressed={on}
      aria-label={label}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId); }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 6.9 4.5c2.1 0 3.5 1.1 5.1 3 1.6-1.9 3-3 5.1-3 3.5 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"
          fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
      {variant === "detail" && <span>{on ? "찜했어요" : "찜하기"}</span>}
    </button>
  );
}

/** 헤더 찜 링크 (개수 표시) */
export function WishBadge() {
  const { ids } = useWish();
  return (
    <Link href="/wishlist" className="wish-link" aria-label={`찜 ${ids.length}개`}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 6.9 4.5c2.1 0 3.5 1.1 5.1 3 1.6-1.9 3-3 5.1-3 3.5 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"
          fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
      {ids.length > 0 && <span className="badge">{ids.length}</span>}
    </Link>
  );
}
