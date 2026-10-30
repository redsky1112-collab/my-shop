"use client";

import { useEffect, useState } from "react";
import type { StyleProfile } from "@/lib/style";

const KEY = "style_profile_v1";

export function loadProfile(): StyleProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StyleProfile) : null;
  } catch {
    return null;
  }
}

/** 이 기기에 저장 + 로그인 상태면 회원 정보에도 저장 */
export async function saveProfile(p: StyleProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
  try {
    await fetch("/api/me/style", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
  } catch {}
}

/** 회원 정보에 저장된 진단 결과 가져오기 (로그인 안 했거나 없으면 null) */
async function fetchServerProfile(): Promise<StyleProfile | null> {
  try {
    const r = await fetch("/api/me", { cache: "no-store" });
    const { user } = await r.json();
    return user?.style?.savedAt ? (user.style as StyleProfile) : null;
  } catch {
    return null;
  }
}

/** loaded=false 동안은 아무것도 그리지 않아 깜빡임 방지 */
export function useStyleProfile() {
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const local = loadProfile();
      const server = await fetchServerProfile();
      // 더 최근에 진단한 쪽을 사용 (다른 기기에서 다시 진단했을 수 있음)
      const best = server && (!local || server.savedAt > local.savedAt) ? server : local;
      if (best && best !== local) {
        try { localStorage.setItem(KEY, JSON.stringify(best)); } catch {}
      }
      if (alive) { setProfile(best); setLoaded(true); }
    })();
    return () => { alive = false; };
  }, []);
  return { profile, loaded };
}
