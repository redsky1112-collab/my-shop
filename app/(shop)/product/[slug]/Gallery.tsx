"use client";

import { useEffect, useRef, useState } from "react";
import Thumb from "@/components/Thumb";

/** 상품 상세 사진: 손가락으로 옆으로 넘기기 + 번호(1/5) + 아래 작은 사진 눌러 이동 + 눌러서 크게 보기 */
export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const n = images.length;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = () => setI(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, []);

  // 크게 보기 열려 있을 때 ESC·좌우 키
  useEffect(() => {
    if (zoom === null) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
      if (e.key === "ArrowRight") setZoom((z) => (z === null ? z : (z + 1) % n));
      if (e.key === "ArrowLeft") setZoom((z) => (z === null ? z : (z - 1 + n) % n));
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [zoom, n]);

  const go = (k: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: k * el.clientWidth, behavior: "smooth" });
  };

  if (n === 0) return <Thumb src={null} alt={alt} />;

  return (
    <div className="gallery">
      <div className="gallery-main">
        <div className="gallery-track" ref={ref}>
          {images.map((src, k) => (
            <button key={src} type="button" className="gallery-slide" onClick={() => setZoom(k)} aria-label={`사진 ${k + 1} 크게 보기`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${alt} ${k + 1}`} loading={k === 0 ? "eager" : "lazy"} />
            </button>
          ))}
        </div>
        {n > 1 && (
          <>
            <span className="gallery-count">{i + 1} / {n}</span>
            <button type="button" className="gallery-nav prev" onClick={() => go(Math.max(0, i - 1))} disabled={i === 0} aria-label="이전 사진">‹</button>
            <button type="button" className="gallery-nav next" onClick={() => go(Math.min(n - 1, i + 1))} disabled={i === n - 1} aria-label="다음 사진">›</button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="gallery-thumbs">
          {images.map((src, k) => (
            <button key={src} type="button" className={k === i ? "on" : ""} onClick={() => go(k)} aria-label={`사진 ${k + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {zoom !== null && (
        <div className="gallery-zoom" role="dialog" aria-modal="true" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[zoom]} alt={`${alt} ${zoom + 1}`} />
          <button type="button" className="gallery-close" aria-label="닫기">✕</button>
          {n > 1 && (
            <>
              <button type="button" className="gallery-nav prev" aria-label="이전 사진"
                onClick={(e) => { e.stopPropagation(); setZoom((zoom - 1 + n) % n); }}>‹</button>
              <button type="button" className="gallery-nav next" aria-label="다음 사진"
                onClick={(e) => { e.stopPropagation(); setZoom((zoom + 1) % n); }}>›</button>
              <span className="gallery-count">{zoom + 1} / {n}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
