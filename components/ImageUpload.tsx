"use client";

import { useRef, useState } from "react";

const MAX_SIDE = 1600; // 긴 변 기준 최대 픽셀
const QUALITY = 0.85;

type Shrunk = { blob: Blob; w: number; h: number };

// 휴대폰 사진(수 MB)을 브라우저에서 바로 줄여서 업로드 → 빠르고 DB 용량도 절약
async function shrink(file: File): Promise<Shrunk> {
  // GIF는 움짤이 깨지지 않게 원본 그대로
  if (file.type === "image/gif") return { blob: file, w: 0, h: 0 };

  const bmp = await createImageBitmap(file); // 최신 브라우저는 사진 회전(EXIF)도 자동 반영
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지 처리를 지원하지 않는 브라우저예요.");
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();

  const toBlob = (type: string) =>
    new Promise<Blob | null>((res) => canvas.toBlob(res, type, QUALITY));
  let blob = await toBlob("image/webp");
  // WebP 미지원 브라우저는 PNG로 돌려주므로 JPEG로 다시
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
  if (!blob) throw new Error("이미지 변환에 실패했어요.");
  return { blob, w, h };
}

export default function ImageUpload({
  name = "imageUrl",
  defaultValue,
  label = "대표 이미지",
}: {
  name?: string;
  defaultValue?: string | null;
  label?: string;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 올릴 수 있어요.");
      return;
    }
    setBusy(true);
    try {
      const { blob, w, h } = await shrink(file);
      const fd = new FormData();
      const ext = blob.type.split("/")[1] || "jpg";
      fd.append("file", blob, `upload.${ext}`);
      const res = await fetch(`/api/admin/upload?w=${w}&h=${h}`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "업로드에 실패했어요.");
      setUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드에 실패했어요.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="upload">
      <span className="upload-label">{label}</span>
      <input type="hidden" name={name} value={url} />

      <div
        className={`upload-box${drag ? " drag" : ""}${url ? " has" : ""}`}
        onClick={() => !busy && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files?.[0]); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="미리보기" />
        ) : (
          <div className="upload-empty">
            <strong>＋ 사진 올리기</strong>
            <span className="small muted">눌러서 사진 선택 · 촬영{"\n"}(PC는 끌어다 놓기도 돼요)</span>
          </div>
        )}
        {busy && <div className="upload-busy">올리는 중…</div>}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => upload(e.target.files?.[0])}
      />

      <div className="row between">
        <div className="row" style={{ gap: 12 }}>
          {url && (
            <>
              <button type="button" className="link" onClick={() => fileRef.current?.click()} disabled={busy}>다른 사진으로</button>
              <button type="button" className="link" onClick={() => setUrl("")} disabled={busy}>사진 빼기</button>
            </>
          )}
        </div>
        <button type="button" className="link" onClick={() => setManual((v) => !v)}>
          {manual ? "주소 입력 닫기" : "이미지 주소로 입력"}
        </button>
      </div>
      {manual && (
        <input value={url} onChange={(e) => setUrl(e.target.value.trim())} placeholder="https://..." />
      )}
      {error && <p className="error small" style={{ margin: 0 }}>{error}</p>}
    </div>
  );
}
