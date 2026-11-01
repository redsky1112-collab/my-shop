import { FITS, STYLES, StyleProfile, TOP_SIZES, labelOf, splitTags } from "./style";

export type RecProduct = {
  id: number; name: string; slug: string; price: number; salePrice: number | null;
  imageUrl: string | null; stock: number; options: string;
  gender: string; styles: string; fit: string;
  optionStock?: Record<string, number> | null; // 사이즈별 재고 (없으면 재고 구분 없음)
};

export const effPrice = (p: { price: number; salePrice: number | null }) =>
  p.salePrice && p.salePrice < p.price ? p.salePrice : p.price;

/** 성별이 안 맞으면 null(제외), 아니면 점수와 추천 이유 */
export function scoreProduct(p: RecProduct, prof: StyleProfile): { score: number; reasons: string[] } | null {
  if (prof.gender !== "U" && p.gender !== "U" && p.gender !== prof.gender) return null;
  if (p.stock <= 0) return null;
  let score = 0;
  const reasons: string[] = [];
  const ps = splitTags(p.styles);
  const hit = ps.filter((s) => prof.styles.includes(s));
  // 취향 스타일이 하나도 안 맞으면 추천하지 않음
  if (!hit.length) return { score: 0, reasons };
  score += hit.length * 3;
  reasons.push(`${hit.map((h) => labelOf(STYLES, h)).join("·")} 스타일`);
  if (p.fit && p.fit === prof.fit) {
    score += 2;
    reasons.push(labelOf(FITS, p.fit));
  }
  const price = effPrice(p);
  if (prof.budget) {
    if (price <= prof.budget) { score += 1; reasons.push("예산 안"); }
    else score -= 2;
  }
  const size = recommendSize(p, prof);
  if (size?.inStock) score += 1;
  return { score, reasons };
}

export function recommend<T extends RecProduct>(list: T[], prof: StyleProfile, limit = 12) {
  return list
    .map((p) => ({ p, r: scoreProduct(p, prof) }))
    .filter((x): x is { p: T; r: { score: number; reasons: string[] } } => !!x.r && x.r.score > 0)
    .sort((a, b) => b.r.score - a.r.score)
    .slice(0, limit);
}

/**
 * 사이즈 추천 (규칙 기반, 설명 가능하게)
 * - 상의(S/M/L 옵션): 평소 사이즈 기준, 핏 선호/체형에 따라 ±1
 * - 하의(숫자 옵션): 평소 허리에 가장 가까운 사이즈
 */
export function recommendSize(
  p: { options: string; fit: string; optionStock?: Record<string, number> | null },
  prof: StyleProfile
): { size: string; why: string; inStock: boolean } | null {
  const opts = splitTags(p.options);
  if (!opts.length) return null;

  if (opts.every((o) => /^\d+$/.test(o))) {
    const nums = opts.map(Number);
    const best = nums.reduce((a, b) => (Math.abs(b - prof.waist) < Math.abs(a - prof.waist) ? b : a));
    return { size: String(best), why: `평소 허리 ${prof.waist}인치 기준`, inStock: inStockOf(p, String(best)) };
  }

  let idx = TOP_SIZES.indexOf(prof.topSize);
  if (idx < 0) return null;
  const notes = [`평소 ${prof.topSize}`];
  if (prof.fit === "over" && p.fit === "slim") { idx += 1; notes.push("슬림핏 상품이라 한 치수 업"); }
  else if (prof.fit === "slim" && p.fit === "over") { idx -= 1; notes.push("오버핏 상품이라 한 치수 다운"); }
  else if ((prof.bodyType === "muscular" || prof.bodyType === "chubby") && p.fit === "slim") {
    idx += 1; notes.push("체형상 슬림핏은 한 치수 업");
  }
  idx = Math.max(0, Math.min(TOP_SIZES.length - 1, idx));
  const want = TOP_SIZES[idx];
  if (opts.includes(want)) return { size: want, why: notes.join(", "), inStock: inStockOf(p, want) };
  // 원하는 사이즈가 없으면 가장 가까운 것
  const avail = opts.filter((o) => TOP_SIZES.includes(o));
  if (!avail.length) return null;
  const near = avail.reduce((a, b) =>
    Math.abs(TOP_SIZES.indexOf(b) - idx) < Math.abs(TOP_SIZES.indexOf(a) - idx) ? b : a
  );
  return { size: near, why: `${notes.join(", ")} (원래 추천 ${want}은 없음)`, inStock: false };
}

/** 추천 사이즈의 재고가 남아 있는지 (사이즈별 재고가 없으면 있다고 봄) */
function inStockOf(p: { optionStock?: Record<string, number> | null }, size: string) {
  if (!p.optionStock) return true;
  return (p.optionStock[size] ?? 0) > 0;
}

/** 실측 CSV → 표 */
export function parseSizeChart(csv: string): { head: string[]; rows: string[][] } | null {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const [head, ...rows] = lines.map((l) => l.split(",").map((c) => c.trim()));
  return { head, rows };
}
