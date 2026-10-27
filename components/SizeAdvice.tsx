"use client";

import Link from "next/link";
import { useStyleProfile } from "./useStyleProfile";
import { recommendSize } from "@/lib/recommend";

export default function SizeAdvice({ options, fit, onPick }: { options: string; fit: string; onPick?: (s: string) => void }) {
  const { profile, loaded } = useStyleProfile();
  if (!loaded || !options) return null;
  if (!profile)
    return (
      <Link href="/style-quiz" className="size-advice ghost">
        내 사이즈가 궁금하다면? <b>1분 진단하고 추천받기 →</b>
      </Link>
    );
  const r = recommendSize({ options, fit }, profile);
  if (!r) return null;
  return (
    <div className="size-advice">
      <div>
        고객님께는 <b className="big">{r.size}</b> 추천
        <div className="muted small">{r.why}</div>
      </div>
      {onPick && <button className="btn small outline" onClick={() => onPick(r.size)}>이 사이즈 선택</button>}
    </div>
  );
}
