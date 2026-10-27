"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  price: number;
  option: string;
  quantity: number;
  adultOnly: boolean;
  imageUrl?: string | null;
};

type Ctx = {
  items: CartItem[];
  add: (item: CartItem) => void;
  setQty: (productId: number, option: string, qty: number) => void;
  remove: (productId: number, option: string) => void;
  clear: () => void;
  count: number;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = "cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items, loaded]);

  const same = (a: CartItem, id: number, opt: string) => a.productId === id && a.option === opt;

  const value: Ctx = {
    items,
    count: items.reduce((s, i) => s + i.quantity, 0),
    add: (item) =>
      setItems((prev) => {
        const found = prev.find((p) => same(p, item.productId, item.option));
        if (found) return prev.map((p) => (p === found ? { ...p, quantity: p.quantity + item.quantity } : p));
        return [...prev, item];
      }),
    setQty: (id, opt, qty) =>
      setItems((prev) => prev.map((p) => (same(p, id, opt) ? { ...p, quantity: Math.max(1, qty) } : p))),
    remove: (id, opt) => setItems((prev) => prev.filter((p) => !same(p, id, opt))),
    clear: () => setItems([]),
  };

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("CartProvider 필요");
  return c;
}
