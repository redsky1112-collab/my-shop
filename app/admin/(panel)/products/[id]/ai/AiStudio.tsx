"use client";

import { useEffect, useRef, useState } from "react";
import { uploadImage } from "@/components/ImageUpload";
import { MODEL_LOOKS, PHOTO_PRESETS, WON_PER_CREDIT, photoCredits } from "@/lib/ai";
import { MAX_PRODUCT_IMAGES } from "@/lib/gallery";

type Job = { id: number; status: string; outputs: string[]; error: string; at: string };

const post = async (url: string, body: unknown) => {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || "요청에 실패했어요.");
  return d;
};

export default function AiStudio(props: {
  enabled: boolean; productId: number; gender: string; images: string[]; garmentImage: string; faceRef: string; recent: Job[];
}) {
  const { enabled, productId } = props;
  const [images, setImages] = useState(props.images);
  const [garment, setGarment] = useState(props.garmentImage);
  const [faceRef, setFaceRef] = useState(props.faceRef);
  const [source, setSource] = useState(props.garmentImage || props.images[0] || "");
  const [look, setLook] = useState(props.gender === "F" ? "F" : "M");
  const [preset, setPreset] = useState<string>(PHOTO_PRESETS[0].key);
  const [extra, setExtra] = useState("");
  const [num, setNum] = useState(2);
  const [resolution, setResolution] = useState<"1k" | "2k">("1k");
  const [useFace, setUseFace] = useState(false);
  const [jobs, setJobs] = useState<Job[]>(props.recent);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [adopted, setAdopted] = useState<string[]>([]);
  const faceInput = useRef<HTMLInputElement>(null);

  const credits = photoCredits(resolution, useFace && !!faceRef) * num;

  // 진행 중인 작업은 3초마다 상태 확인
  useEffect(() => {
    const pending = jobs.filter((j) => j.status === "processing");
    if (!pending.length) return;
    const t = setTimeout(async () => {
      const updated = await Promise.all(pending.map(async (j) => {
        try {
          const r = await fetch(`/api/admin/ai/job?id=${j.id}`, { cache: "no-store" });
          const d = await r.json();
          return r.ok ? { ...j, status: d.status, outputs: d.outputs ?? [], error: d.error ?? "" } : j;
        } catch { return j; }
      }));
      setJobs((cur) => cur.map((j) => updated.find((u) => u.id === j.id) ?? j));
    }, 3000);
    return () => clearTimeout(t);
  }, [jobs]);

  async function generate() {
    setMsg("");
    if (!source) return setMsg("먼저 상품 사진을 올려 주세요.");
    setBusy(true);
    try {
      const d = await post("/api/admin/ai/photo", { productId, source, preset, look, extra, num, resolution, useFace });
      setJobs((j) => [{ id: d.jobId, status: "processing", outputs: [], error: "", at: "방금" }, ...j]);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "요청에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function adopt(url: string, asMain: boolean) {
    setMsg("");
    try {
      const d = await post("/api/admin/ai/adopt", { productId, url, asMain });
      setImages(d.images);
      setAdopted((a) => [...a, url]);
      setMsg(asMain ? "대표 사진으로 추가했어요." : "상품 사진에 추가했어요.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "추가하지 못했어요.");
    }
  }

  async function pickGarment(u: string) {
    const next = garment === u ? "" : u;
    try {
      await post("/api/admin/ai/settings", { productId, garment: next });
      setGarment(next);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "저장하지 못했어요.");
    }
  }

  async function uploadFace(file: File | undefined) {
    if (!file) return;
    try {
      const url = await uploadImage(file);
      await post("/api/admin/ai/settings", { faceRef: url });
      setFaceRef(url);
      setUseFace(true);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "업로드에 실패했어요.");
    } finally {
      if (faceInput.current) faceInput.current.value = "";
    }
  }

  return (
    <div className="ai-studio">
      {!enabled && (
        <div className="ai-off">
          <b>AI 기능이 아직 꺼져 있어요</b>
          <ol className="small">
            <li>fashn.ai 가입 → Developer API → API Key 만들기, 크레딧 충전</li>
            <li>Vercel → my-shop → Settings → Environment Variables에 <code>FASHN_API_KEY</code> = 발급받은 키</li>
            <li>Deployments에서 Redeploy 하면 바로 켜져요</li>
          </ol>
        </div>
      )}
      {msg && <p className="form-ok">{msg}</p>}

      <section className="box">
        <h3>① 가상 피팅용 옷 사진</h3>
        <p className="small muted">고객 가상 피팅에 쓸 <b>옷만 찍힌 정면 사진</b>(마네킹·바닥 촬영)을 골라 주세요. 안 고르면 첫 사진을 써요.</p>
        <div className="ai-thumbs">
          {images.map((u) => (
            <button key={u} type="button" className={garment === u ? "on" : ""} onClick={() => pickGarment(u)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" />
              {garment === u && <span>피팅용</span>}
            </button>
          ))}
          {images.length === 0 && <p className="muted small">상품 수정에서 사진을 먼저 올려 주세요.</p>}
        </div>
      </section>

      <section className="box">
        <h3>② AI 착용 화보 만들기</h3>
        <span className="upload-label">원본 옷 사진</span>
        <div className="ai-thumbs">
          {images.map((u) => (
            <button key={u} type="button" className={source === u ? "on" : ""} onClick={() => setSource(u)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" />
            </button>
          ))}
        </div>
        <div className="form">
          <div className="row">
            <label>모델
              <select value={look} onChange={(e) => setLook(e.target.value)}>
                {MODEL_LOOKS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </label>
            <label>배경·분위기
              <select value={preset} onChange={(e) => setPreset(e.target.value)}>
                {PHOTO_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </label>
          </div>
          <label>추가 요청 (선택, 영어가 더 정확해요)
            <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="예: hands in pockets, wearing white sneakers" />
          </label>
          <div className="row">
            <label>장수
              <select value={num} onChange={(e) => setNum(Number(e.target.value))}>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}장</option>)}
              </select>
            </label>
            <label>화질
              <select value={resolution} onChange={(e) => setResolution(e.target.value as "1k" | "2k")}>
                <option value="1k">기본 (빠름·저렴)</option>
                <option value="2k">고화질 (상세페이지용)</option>
              </select>
            </label>
          </div>
          <div className="ai-face">
            {faceRef ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={faceRef} alt="브랜드 모델 얼굴" />
            ) : <div className="ai-face-empty">얼굴</div>}
            <div className="grow">
              <label className="check">
                <input type="checkbox" checked={useFace && !!faceRef} disabled={!faceRef} onChange={(e) => setUseFace(e.target.checked)} />
                브랜드 모델 얼굴 고정 (모든 상품 화보를 같은 모델로, +3크레딧/장)
              </label>
              <button type="button" className="link small" onClick={() => faceInput.current?.click()}>
                {faceRef ? "얼굴 사진 바꾸기" : "얼굴 사진 등록 (AI로 만든 가상 인물 권장)"}
              </button>
              <input ref={faceInput} type="file" accept="image/*" hidden onChange={(e) => uploadFace(e.target.files?.[0])} />
            </div>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            예상 {credits}크레딧 (약 {(credits * WON_PER_CREDIT).toLocaleString("ko-KR")}원) · 보통 10~30초 걸려요
          </p>
          <button type="button" className="btn" disabled={!enabled || busy || !source} onClick={generate}>
            {busy ? "요청 중…" : "AI 화보 만들기"}
          </button>
        </div>
      </section>

      <section>
        <h3>결과 (최근 3일)</h3>
        <p className="small muted">마음에 드는 사진만 상품 사진에 추가하세요. 추가하지 않은 결과는 3일 뒤 사라져요. (상품 사진 {images.length}/{MAX_PRODUCT_IMAGES}장)</p>
        {jobs.length === 0 && <p className="muted">아직 만든 화보가 없어요.</p>}
        {jobs.map((j) => (
          <div key={j.id} className="ai-job">
            <div className="small muted">{j.at} · {j.status === "processing" ? "만드는 중…" : j.status === "failed" ? `실패: ${j.error}` : `${j.outputs.length}장`}</div>
            {j.status === "processing" && <div className="ai-loading">AI가 사진을 만들고 있어요 ⏳</div>}
            <div className="ai-results">
              {j.outputs.map((u) => (
                <div key={u} className="ai-result">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <a href={u} target="_blank" rel="noreferrer"><img src={u} alt="AI 화보" /></a>
                  {adopted.includes(u) ? <span className="small">추가됨 ✓</span> : (
                    <div className="row" style={{ gap: 6 }}>
                      <button type="button" className="btn small outline" onClick={() => adopt(u, false)}>사진 추가</button>
                      <button type="button" className="btn small" onClick={() => adopt(u, true)}>대표로</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
