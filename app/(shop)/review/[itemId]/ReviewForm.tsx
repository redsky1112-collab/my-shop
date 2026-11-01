"use client";

import { useRef, useState } from "react";
import ActionForm, { SubmitButton } from "@/components/ActionForm";
import { shrink } from "@/components/ImageUpload";
import { BODY_TYPES } from "@/lib/style";
import { REVIEW_MAX, REVIEW_MIN, REVIEW_PHOTOS, SIZE_FEELS } from "@/lib/reviews";
import { submitReview } from "../actions";

type Body = { gender: string; height: number; weight: number; bodyType: string };

export default function ReviewForm({ itemId, body }: { itemId: number; body: Body }) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [sizeFeel, setSizeFeel] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [upErr, setUpErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUpErr("");
    setBusy(true);
    try {
      const next = [...photos];
      for (const f of Array.from(files).slice(0, REVIEW_PHOTOS - photos.length)) {
        const { blob, w, h } = await shrink(f);
        const fd = new FormData();
        fd.append("file", blob, `review.${blob.type.split("/")[1] || "jpg"}`);
        const res = await fetch(`/api/review/upload?w=${w}&h=${h}`, { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "업로드에 실패했어요.");
        next.push(data.url);
        setPhotos([...next]);
      }
    } catch (e) {
      setUpErr(e instanceof Error ? e.message : "업로드에 실패했어요.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <ActionForm action={submitReview} className="form">
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="rating" value={rating || ""} />
      <input type="hidden" name="photos" value={photos.join(",")} />

      <div>
        <span className="upload-label">별점</span>
        <div className="stars-input" role="radiogroup" aria-label="별점">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}점`}
              className={n <= rating ? "on" : ""} onClick={() => setRating(n)}>★</button>
          ))}
        </div>
      </div>

      <div>
        <span className="upload-label">사이즈는 어땠나요?</span>
        <div className="chips">
          {SIZE_FEELS.map((s) => (
            <label key={s.key} className="chip-radio">
              <input type="radio" name="sizeFeel" value={s.key} required checked={sizeFeel === s.key} onChange={() => setSizeFeel(s.key)} /> <span>{s.label}</span>
            </label>
          ))}
        </div>
      </div>

      <label>후기 ({content.length}/{REVIEW_MAX})
        <textarea name="content" rows={6} minLength={REVIEW_MIN} maxLength={REVIEW_MAX} required
          placeholder="핏, 소재, 색감, 코디 팁 등을 알려 주세요. 다른 분들께 큰 도움이 돼요."
          value={content} onChange={(e) => setContent(e.target.value)} />
      </label>

      <fieldset className="box">
        <legend>내 체형 (선택 · "나와 비슷한 체형" 리뷰에 쓰여요)</legend>
        <p className="small muted" style={{ margin: "0 0 8px" }}>스타일 진단 값으로 미리 채웠어요. 이름은 김*수처럼 가려져요.</p>
        <div className="row">
          <label>성별
            <select name="gender" defaultValue={body.gender}>
              <option value="">선택 안 함</option>
              <option value="M">남성</option>
              <option value="F">여성</option>
            </select>
          </label>
          <label>체형
            <select name="bodyType" defaultValue={body.bodyType}>
              <option value="">선택 안 함</option>
              {BODY_TYPES.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
            </select>
          </label>
        </div>
        <div className="row">
          <label>키 (cm)<input name="height" type="number" inputMode="numeric" min={120} max={220} defaultValue={body.height || ""} /></label>
          <label>몸무게 (kg)<input name="weight" type="number" inputMode="numeric" min={30} max={200} defaultValue={body.weight || ""} /></label>
        </div>
      </fieldset>

      <div className="claim-photos">
        <span className="upload-label">사진 (선택, 최대 {REVIEW_PHOTOS}장 · 착용 사진이면 더 좋아요)</span>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-start" }}>
          {photos.map((u) => (
            <span key={u} className="claim-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" />
              <button type="button" onClick={() => setPhotos(photos.filter((x) => x !== u))} aria-label="사진 빼기">✕</button>
            </span>
          ))}
          {photos.length < REVIEW_PHOTOS && (
            <button type="button" className="claim-add" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? "올리는 중…" : "＋ 사진"}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
        {upErr && <p className="error small">{upErr}</p>}
      </div>

      <SubmitButton>리뷰 등록</SubmitButton>
    </ActionForm>
  );
}
