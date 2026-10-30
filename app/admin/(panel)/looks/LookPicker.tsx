"use client";

import { useMemo, useState } from "react";
import { GENDERS, STYLES, splitTags } from "@/lib/style";
import { LINES, lineOf } from "@/lib/lines";
import { won } from "@/lib/format";

export type PickProduct = {
  id: number; name: string; category: string; line: string; gender: string; styles: string;
  imageUrl: string | null; price: number;
};

/**
 * 코디 조건(성별·라인·스타일)에 맞는 상품을 먼저 보여주는 선택기.
 * 고른 순서대로 코디에 노출돼요.
 */
export default function LookPicker({
  products,
  init,
}: {
  products: PickProduct[];
  init: { gender: string; line: string; styles: string[]; selected: number[] };
}) {
  const [gender, setGender] = useState(init.gender || "U");
  const [line, setLine] = useState(init.line || "");
  const [styles, setStyles] = useState<string[]>(init.styles);
  const [picked, setPicked] = useState<number[]>(init.selected);
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);

  const toggleStyle = (k: string) => setStyles((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const togglePick = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // 조건 점수: 성별이 안 맞으면 제외, 라인 일치 +2, 스타일 겹침 +1씩
  const { match, rest } = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const list = products.filter((p) => !kw || p.name.toLowerCase().includes(kw) || p.category.toLowerCase().includes(kw));
    const scored = list.map((p) => {
      const genderOk = gender === "U" || p.gender === "U" || p.gender === gender;
      const lineOk = !line || p.line === line;
      const hit = splitTags(p.styles).filter((s) => styles.includes(s)).length;
      const styleOk = styles.length === 0 || hit > 0;
      return { p, ok: genderOk && lineOk && styleOk, score: (p.line === line ? 2 : 0) + hit };
    });
    return {
      match: scored.filter((x) => x.ok).sort((a, b) => b.score - a.score).map((x) => x.p),
      rest: scored.filter((x) => !x.ok).map((x) => x.p),
    };
  }, [products, gender, line, styles, q]);

  const byId = new Map(products.map((p) => [p.id, p]));

  const row = (p: PickProduct) => {
    const n = picked.indexOf(p.id);
    return (
      <button type="button" key={p.id} className={`pick${n >= 0 ? " on" : ""}`} onClick={() => togglePick(p.id)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.imageUrl ? <img src={p.imageUrl} alt="" /> : <span className="pick-ph">{p.name.slice(0, 1)}</span>}
        <span className="pick-text">
          <b>{p.name}</b>
          <span className="small muted">
            {p.category}{lineOf(p.line) ? ` · ${lineOf(p.line)!.name}` : ""} · {won(p.price)}
          </span>
        </span>
        <span className="pick-no">{n >= 0 ? n + 1 : "+"}</span>
      </button>
    );
  };

  return (
    <>
      {/* 폼으로 전송되는 값 */}
      {styles.map((s) => <input key={s} type="hidden" name="styles" value={s} />)}
      {picked.map((id) => <input key={id} type="hidden" name="productIds" value={id} />)}

      <div className="row">
        <label>성별
          <select name="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
            {GENDERS.map((g) => <option key={g.key} value={g.key}>{g.key === "U" ? "공용" : g.label}</option>)}
          </select>
        </label>
        <label>브랜드 라인
          <select name="line" value={line} onChange={(e) => setLine(e.target.value)}>
            <option value="">전체</option>
            {LINES.map((l) => <option key={l.key} value={l.key}>{l.name}</option>)}
          </select>
        </label>
      </div>
      <div className="chips">
        {STYLES.map((s) => (
          <button type="button" key={s.key} className={`chip${styles.includes(s.key) ? " on" : ""}`} onClick={() => toggleStyle(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      <fieldset className="box">
        <legend>코디에 넣을 상품 (2개 이상, 누른 순서대로 노출)</legend>

        {picked.length > 0 && (
          <div className="picked">
            {picked.map((id, i) => (
              <button type="button" key={id} className="tag strong" onClick={() => togglePick(id)}>
                {i + 1}. {byId.get(id)?.name ?? `상품 ${id}`} ✕
              </button>
            ))}
          </div>
        )}

        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="상품명·카테고리 검색" />

        <p className="small muted" style={{ margin: 0 }}>
          조건에 맞는 상품 {match.length}개
          {(line || styles.length > 0 || gender !== "U") && " (성별·라인·스타일 기준)"}
        </p>
        <div className="pick-list">{match.map(row)}</div>
        {match.length === 0 && <p className="small muted">조건에 맞는 상품이 없어요. 상품 등록 때 라인·스타일을 지정해 주세요.</p>}

        {rest.length > 0 && (
          <>
            <button type="button" className="link" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "다른 상품 접기" : `조건 밖의 다른 상품도 보기 (${rest.length})`}
            </button>
            {showAll && <div className="pick-list dim">{rest.map(row)}</div>}
          </>
        )}
      </fieldset>
    </>
  );
}
