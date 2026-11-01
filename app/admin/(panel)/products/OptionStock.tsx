"use client";

import { useState } from "react";

type Row = { option: string; stock: number };

const PRESETS: { label: string; options: string[] }[] = [
  { label: "S·M·L·XL", options: ["S", "M", "L", "XL"] },
  { label: "44·55·66·77", options: ["44", "55", "66", "77"] },
  { label: "26~34 (허리)", options: ["26", "27", "28", "29", "30", "31", "32", "34"] },
  { label: "FREE", options: ["FREE"] },
];

/** 옵션(사이즈)별 재고 입력. 옵션이 없으면 상품 전체 재고 한 칸 */
export default function OptionStock({ init, total }: { init: Row[]; total: number }) {
  const [rows, setRows] = useState<Row[]>(init);
  const [single, setSingle] = useState(total);
  const set = (i: number, k: keyof Row, v: string) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: k === "stock" ? Math.max(0, Math.floor(Number(v) || 0)) : v } : x)));
  const sum = rows.reduce((a, r) => a + (r.option.trim() ? r.stock : 0), 0);

  return (
    <fieldset className="box">
      <legend>옵션(사이즈)별 재고</legend>
      <div className="chips">
        {PRESETS.map((p) => (
          <button type="button" key={p.label} className="chip"
            onClick={() => setRows(p.options.map((o) => ({ option: o, stock: rows.find((r) => r.option === o)?.stock ?? 0 })))}>
            {p.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <>
          <p className="small muted" style={{ margin: 0 }}>옵션이 없는 상품이에요. 위 버튼이나 &quot;옵션 추가&quot;로 사이즈를 만들 수 있어요.</p>
          <label>재고<input name="stock" type="number" min={0} value={single} onChange={(e) => setSingle(Math.max(0, Math.floor(Number(e.target.value) || 0)))} /></label>
        </>
      ) : (
        <>
          <input type="hidden" name="stock" value={sum} />
          <div className="opt-rows">
            {rows.map((r, i) => (
              <div key={i} className={`opt-row${r.stock === 0 ? " zero" : ""}`}>
                <input name="opt_name" value={r.option} onChange={(e) => set(i, "option", e.target.value)} placeholder="사이즈" aria-label="옵션 이름" />
                <input name="opt_stock" type="number" min={0} inputMode="numeric" value={r.stock} onChange={(e) => set(i, "stock", e.target.value)} aria-label="재고" />
                <span className="small muted">{r.stock === 0 ? "품절" : "개"}</span>
                <button type="button" className="link" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="옵션 삭제">✕</button>
              </div>
            ))}
          </div>
          <p className="small" style={{ margin: 0 }}>합계 <b>{sum}개</b> (상품 재고로 자동 반영)</p>
        </>
      )}
      <button type="button" className="link" style={{ justifySelf: "start" }} onClick={() => setRows([...rows, { option: "", stock: 0 }])}>+ 옵션 추가</button>
    </fieldset>
  );
}
