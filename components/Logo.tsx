// DUOLOGUE 로고: 금색 따옴표 심볼 + 세리프 워드마크
// 폰트에 상관없이 똑같이 보이도록 심볼은 SVG 도형으로 그림

export function QuoteMark({ size = 22, color = "var(--gold)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 0.78} viewBox="0 0 36 28" aria-hidden="true" focusable="false">
      <g fill={color}>
        <circle cx="9" cy="8.5" r="7" />
        <path d="M15.6 10.5C16.4 18 12 24.2 4.2 27l-1-2.4C8.4 22 11 18.3 10.6 12.6z" />
        <circle cx="27" cy="8.5" r="7" />
        <path d="M33.6 10.5C34.4 18 30 24.2 22.2 27l-1-2.4C26.4 22 29 18.3 28.6 12.6z" />
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
