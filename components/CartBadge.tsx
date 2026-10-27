"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export default function CartBadge() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="cart-link">
      장바구니{count > 0 && <span className="badge">{count}</span>}
    </Link>
  );
}
