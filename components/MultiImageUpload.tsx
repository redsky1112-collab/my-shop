"use client";

import { useRef, useState } from "react";
import { uploadImage } from "./ImageUpload";
import { MAX_PRODUCT_IMAGES } from "@/lib/gallery";

// 상품 사진 여러 장 — 한 번에 여러 장 선택, 순서 바꾸기(◀ ▶), 대표 지정, 빼기
// 폼에는 hidden input name="images" 를 순서대로 여러 개 넣음 (첫 장 = 대표 사진)
export default function MultiImageUpload({
  name = "images",
  defaultValue = [],
  label = "상품 사진",
}: {
  name?: string;
  defaultValue?: string[];
  label?: string;
}) {
  const [urls, setUrls] = useState<string[]>(defaultValue);
  const [busy, setBusy] = useState(0); // 올리는 중인 장수
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const left = MAX_PRODUCT_IMAGES - urls.length - busy;

  async function addFiles(list: FileList | null | undefined) {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (fileRef.current) fileRef.current.value = "";
    if (!files.length) return;
    setError("");
    const take = files.slice(0, Math.max(0, left));
    if (take.length < files.length) setError(`사진은 ${MAX_PRODUCT_IMAGES}장까지예요. ${files.length - take.length}장은 빠졌어요.`);
    if (!take.length) return;
    setBusy((b) => b + take.length);
    // 순서 유지: 각 사진 업로드를 동시에 하되 결과는 고른 순서대로 붙임
    const results = await Promise.allSettled(take.map((f) => uploadImage(f)));
    const ok = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    setUrls((u) => [...new Set([...u, ...ok])]);
    setBusy((b) => b - take.length);
    if (failed) {
      const msg = failed.reason instanceof Error ? failed.reason.message : "업로드에 실패했어요.";
      setError(`${results.length - ok.length}장 실패: ${msg}`);
    }
  }

  const move = (i: number, d: -1 | 1) =>
    setUrls((u) => {
      const j = i + d;
      if (j < 0 || j >= u.length) return u;
      const n = [...u];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const makeMain = (i: number) => setUrls((u) => [u[i], ...u.filter((_, k) => k !== i)]);
  const remove = (i: number) => setUrls((u) => u.filter((_, k) => k !== i));

  function addManual() {
    const v = manual.trim();
    if (!/^https:\/\/\S+$/i.test(v)) { setError("https:// 로 시작하는 주소를 넣어 주세요."); return; }
    if (left <= 0) { setError(`사진은 ${MAX_PRODUCT_IMAGES}장까지예요.`); return; }
    setUrls((u) => (u.includes(v) ? u : [...u, v]));
    setManual("");
    setError("");
  }

  return (
    <div className="upload">
      <span className="upload-label">
        {label} <span className="muted">({urls.length}/{MAX_PRODUCT_IMAGES}장 · 첫 장이 대표 사진)</span>
      </span>
      {urls.map((u) => <input key={u} type="hidden" name={name} value={u} />)}

      <div
        className={`multi-upload${drag ? " drag" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
      >
        {urls.map((u, i) => (
          <div key={u} className="mu-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt={`상품 사진 ${i + 1}`} />
            {i === 0 && <span className="mu-main">대표</span>}
            <div className="mu-tools">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="앞으로">◀</button>
              {i > 0 && <button type="button" onClick={() => makeMain(i)}>대표로</button>}
              <button type="button" onClick={() => remove(i)} aria-label="빼기">✕</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === urls.length - 1} aria-label="뒤로">▶</button>
            </div>
          </div>
        ))}
        {Array.from({ length: busy }).map((_, i) => (
          <div key={`busy${i}`} className="mu-item mu-busy">올리는 중…</div>
        ))}
        {left > 0 && (
          <button type="button" className="mu-add" onClick={() => fileRef.current?.click()}>
            <strong>＋ 사진 추가</strong>
            <span className="small muted">여러 장 한 번에{"\n"}선택할 수 있어요</span>
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />

      <div className="row" style={{ gap: 8 }}>
        <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="이미지 주소로 추가 (https://...)" />
        <button type="button" className="btn outline" onClick={addManual}>추가</button>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        추천 순서: 정면 착용 → 뒷면 → 디테일(원단·단추) → 전체 코디. 3:4 세로 사진이 가장 예쁘게 보여요.
      </p>
      {busy > 0 && <p className="small muted" style={{ margin: 0 }}>사진을 다 올린 뒤에 저장해 주세요.</p>}
      {error && <p className="error small" style={{ margin: 0 }}>{error}</p>}
    </div>
  );
}
