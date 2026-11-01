"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type Slide = { id: number; imageUrl: string; tagline: string; title: string; sub: string; link: string; full?: boolean };

/** 첫 화면 모델 사진 배너: 손가락으로 넘기기 + 6초마다 자동 넘김 */
export default function HeroSlider({ slides }: { slides: Slide[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const n = slides.length;

  const go = (k: number) => {
    const el = ref.current;
    if (!el) return;
    const idx = (k + n) % n;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  };

  // 스크롤 위치로 현재 번호 계산 (손가락으로 넘겨도 맞게)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = () => setI(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => go(i + 1), 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, n]);

  return (
    <section className="hero-photo" aria-roledescription="carousel">
      <div className="hero-track" ref={ref}>
        {slides.map((s, k) => {
          const body = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.imageUrl} alt={s.title || "DUOLOGUE"} loading={k === 0 ? "eager" : "lazy"} />
              {!s.full && (
                <>
                  <div className="hero-shade" />
                  <div className="hero-copy">
                    {s.tagline && <p className="hero-tag">{s.tagline}</p>}
                    {s.title && <h1 className="hero-title">{s.title}</h1>}
                    {s.sub && <p className="hero-lead">{s.sub}</p>}
                  </div>
                </>
              )}
            </>
          );
          const cls = s.full ? "hero-slide full" : "hero-slide";
          return s.link ? (
            <Link key={s.id} href={s.link} className={cls}>{body}</Link>
          ) : (
            <div key={s.id} className={cls}>{body}</div>
          );
        })}
      </div>
      {n > 1 && (
        <div className="hero-ctrl">
          <span>{i + 1} / {n}</span>
          <button type="button" aria-label="다음 사진" onClick={() => go(i + 1)}>→</button>
        </div>
      )}
    </section>
  );
}
