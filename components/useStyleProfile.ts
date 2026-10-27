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

export function saveProfile(p: StyleProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

/** loaded=false 동안은 아무것도 그리지 않아 깜빡임 방지 */
export function useStyleProfile() {
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setProfile(loadProfile());
    setLoaded(true);
  }, []);
  return { profile, loaded };
}
