// DUOLOGUE 로고: 금색 따옴표 심볼 + 세리프 워드마크
// 폰트에 상관없이 똑같이 보이도록 심볼은 SVG 도형으로 그림

// 심볼 모양(2026-11-01 확정): 각진 사각 머리 + 왼쪽 아래로 휘는 꼬리의 닫는 따옴표 ”
const QUOTE_GLYPH = "M2 0H15.6Q17.6 0 17.6 2V14.5C17.6 21.5 11.5 26.6 4 27.95Q3 28.1 3.2 27.4C7.4 24.4 9.9 21.2 9.9 18.4Q9.9 16.6 8.4 16.6H2Q0 16.6 0 14.6V2Q0 0 2 0Z";

export function QuoteMark({ size = 22, color = "var(--gold)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={(size * 28) / 41.5} viewBox="0 0 41.5 28" aria-hidden="true" focusable="false">
      <g fill={color}>
        <path d={QUOTE_GLYPH} />
        <path transform="translate(23.9 0)" d={QUOTE_GLYPH} />
      </g>
    </svg>
  );
}

export default function Logo({ stacked = false, light = false }: { stacked?: boolean; light?: boolean }) {
  return (
    <span className={`brand-logo${stacked ? " stacked" : ""}${light ? " light" : ""}`}>
      <QuoteMark size={stacked ? 34 : 18} />
      <span className="brand-word">DUOLOGUE</span>
      {stacked && <span className="brand-sub">SEOUL / CONTEMPORARY</span>}
    </span>
  );
}
