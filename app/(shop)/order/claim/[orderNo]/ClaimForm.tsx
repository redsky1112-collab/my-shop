"use client";

import { useRef, useState } from "react";
import ActionForm, { SubmitButton } from "@/components/ActionForm";
import { shrink } from "@/components/ImageUpload";
import { CLAIM_REASONS } from "@/lib/claims";
import { submitClaim } from "../actions";
import { won } from "@/lib/format";

type Item = { id: number; name: string; option: string; price: number; max: number; options: { option: string; stock: number }[] };

export default function ClaimForm({ orderNo, phone, items, buyerOk }: { orderNo: string; phone: string; items: Item[]; buyerOk: boolean }) {
  const [type, setType] = useState<"RETURN" | "EXCHANGE">("RETURN");
  const [qty, setQty] = useState<Record<number, number>>(() => (items.length === 1 && items[0].max === 1 ? { [items[0].id]: 1 } : {}));
  const [to, setTo] = useState<Record<number, string>>({});
  const reasons = CLAIM_REASONS.filter((r) => r.sellerFault || buyerOk);
  const [reason, setReason] = useState<string>(reasons[0]?.key ?? "");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [upErr, setUpErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const fault = CLAIM_REASONS.find((r) => r.key === reason)?.sellerFault ?? false;

  const lines = items
    .filter((i) => (qty[i.id] ?? 0) > 0)
    .map((i) => ({ itemId: i.id, qty: qty[i.id], toOption: type === "EXCHANGE" ? to[i.id] || "" : "" }));

  async function upload(files: FileList | null) {
    if (!files) return;
    setUpErr("");
    setBusy(true);
    try {
      for (const f of Array.from(files).slice(0, 5 - photos.length)) {
        const { blob, w, h } = await shrink(f);
        const fd = new FormData();
        fd.append("file", blob, `claim.${blob.type.split("/")[1] || "jpg"}`);
        const res = await fetch(`/api/claim/upload?orderNo=${encodeURIComponent(orderNo)}&phone=${phone}&w=${w}&h=${h}`, { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "사진 업로드에 실패했어요.");
        setPhotos((p) => [...p, data.url]);
      }
    } catch (e) {
      setUpErr(e instanceof Error ? e.message : "사진 업로드에 실패했어요.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <ActionForm action={submitClaim} className="form">
      <input type="hidden" name="orderNo" value={orderNo} />
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      <input type="hidden" name="photos" value={photos.join(",")} />

      <div className="chips">
        <button type="button" className={`chip${type === "RETURN" ? " on" : ""}`} onClick={() => setType("RETURN")}>반품 (환불)</button>
        <button type="button" className={`chip${type === "EXCHANGE" ? " on" : ""}`} onClick={() => setType("EXCHANGE")}>교환 (다른 사이즈)</button>
      </div>

      <h3>상품 선택</h3>
      {items.map((i) => (
        <div key={i.id} className="claim-item">
          <div>
            <b>{i.name}</b>{i.option && <span className="muted"> ({i.option})</span>}
            <div className="small muted">{won(i.price)} · 신청 가능 {i.max}개</div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <input type="number" min={0} max={i.max} value={qty[i.id] ?? 0} inputMode="numeric" aria-label="수량"
              onChange={(e) => setQty({ ...qty, [i.id]: Math.max(0, Math.min(i.max, Math.floor(Number(e.target.value) || 0))) })} />
            {type === "EXCHANGE" && i.options.length > 0 && (
              <select value={to[i.id] || ""} onChange={(e) => setTo({ ...to, [i.id]: e.target.value })} aria-label="교환할 사이즈">
                <option value="">교환할 사이즈</option>
                {i.options.map((o) => (
                  <option key={o.option} value={o.option} disabled={o.stock < (qty[i.id] || 1)}>
                    {o.option}{o.stock <= 0 ? " (품절)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      ))}

      <label>사유
        <select name="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
          {reasons.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
      </label>
      {!buyerOk && <p className="small muted" style={{ margin: 0 }}>받은 지 7일이 지나 불량·오배송·상품 차이 사유만 신청할 수 있어요.</p>}
      <label>자세한 내용 {fault && "(필수)"}
        <textarea name="detail" rows={4} required={fault} placeholder="어떤 점이 문제인지 알려 주세요." />
      </label>

      <div className="claim-photos">
        <span className="upload-label">사진 {fault ? "(필수, 최대 5장)" : "(선택, 최대 5장)"}</span>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-start" }}>
          {photos.map((u) => (
            <span key={u} className="claim-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" />
              <button type="button" onClick={() => setPhotos(photos.filter((x) => x !== u))} aria-label="사진 빼기">✕</button>
            </span>
          ))}
          {photos.length < 5 && (
            <button type="button" className="claim-add" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? "올리는 중…" : "＋ 사진"}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
        {upErr && <p className="error small">{upErr}</p>}
      </div>

      <SubmitButton>{type === "EXCHANGE" ? "교환 신청하기" : "반품 신청하기"}</SubmitButton>
    </ActionForm>
  );
}
