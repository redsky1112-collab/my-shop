"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { WISH_LOCAL_KEY, WISH_MAX, cleanIds } from "@/lib/wish";

type Ctx = { ids: number[]; ready: boolean; member: boolean; has: (id: number) => boolean; toggle: (id: number) => Promise<void> };
const WishCtx = createContext<Ctx>({ ids: [], ready: false, member: false, has: () => false, toggle: async () => {} });

const readLocal = () => {
  try { return cleanIds(JSON.parse(localStorage.getItem(WISH_LOCAL_KEY) || "[]")); } catch { return []; }
};
const writeLocal = (ids: number[]) => {
  try {
    if (ids.length) localStorage.setItem(WISH_LOCAL_KEY, JSON.stringify(ids));
    else localStorage.removeItem(WISH_LOCAL_KEY);
  } catch {}
};

/** 찜 상태: 회원은 서버, 비회원은 이 기기 브라우저. 로그인하면 비회원 찜을 회원 찜으로 합침 */
export function WishProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const [member, setMember] = useState(false);
  const idsRef = useRef(ids);
  useEffect(() => { idsRef.current = ids; }, [ids]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const local = readLocal();
      let next = local;
      let isMember = false;
      try {
        const r = await fetch("/api/wishlist", { cache: "no-store" });
        const d = await r.json();
        if (d.member) {
          isMember = true;
          next = cleanIds(d.ids);
          if (local.length) {
            const m = await fetch("/api/wishlist", {
              method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ merge: local }),
            });
            if (m.ok) {
              next = cleanIds((await m.json()).ids);
              writeLocal([]); // 합쳤으니 기기 저장분은 비움 (로그아웃 후 다른 사람에게 안 보이게)
            }
          }
        }
      } catch {}
      if (alive) { setIds(next); setMember(isMember); setReady(true); }
    })();
    return () => { alive = false; };
  }, []);

  const toggle = useCallback(async (id: number) => {
    const prev = idsRef.current;
    const on = !prev.includes(id);
    if (on && prev.length >= WISH_MAX) { alert(`찜은 ${WISH_MAX}개까지 할 수 있어요.`); return; }
    const next = on ? [id, ...prev] : prev.filter((x) => x !== id);
    setIds(next);
    if (!member) { writeLocal(next); return; }
    try {
      const r = await fetch("/api/wishlist", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: id, on }),
      });
      if (!r.ok) throw new Error();
    } catch {
      setIds((cur) => (on ? cur.filter((x) => x !== id) : cur.includes(id) ? cur : [id, ...cur]));
    }
  }, [member]);

  const has = useCallback((id: number) => ids.includes(id), [ids]);
  return <WishCtx.Provider value={{ ids, ready, member, has, toggle }}>{children}</WishCtx.Provider>;
}

export const useWish = () => useContext(WishCtx);
