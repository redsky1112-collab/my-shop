"use client";

import Link from "next/link";
import { useStyleProfile } from "./useStyleProfile";
import { recommendSize } from "@/lib/recommend";

export default function SizeAdvice({
  options, fit, optionStock = null, onPick,
}: { options: string; fit: string; optionStock?: Record<string, number> | null; onPick?: (s: string) => void }) {
  const { profile, loaded } = useStyleProfile();
  if (!loaded || !options) return null;
  if (!profile)
    return (
      <Link href="/style-quiz" className="size-advice ghost">
        내 사이즈가 궁금하다면? <b>1분 진단하고 추천받기 →</b>
      </Link>
    );
  const r = recommendSize({ options, fit, optionStock }, profile);
  if (!r) return null;
  const soldOut = !!optionStock && (optionStock[r.size] ?? 0) <= 0;
  return (
    <div className={`size-advice${soldOut ? " warn" : ""}`}>
      <div>
        고객님께는 <b className="big">{r.size}</b> 추천{soldOut && <b className="out-tag"> · 지금 품절</b>}
        <div className="muted small">{soldOut ? "재입고되면 다시 확인해 주세요. 실측표로 다른 사이즈도 비교해 보세요." : r.why}</div>
      </div>
      {onPick && !soldOut && <button className="btn small outline" onClick={() => onPick(r.size)}>이 사이즈 선택</button>}
    </div>
  );
}
