"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { shrink } from "./ImageUpload";
import { FITTING_DAILY } from "@/lib/ai";

type Info = { enabled: boolean; member?: boolean; left?: number; blocked?: string };

const toDataUri = (blob: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("사진을 읽지 못했어요."));
    r.readAsDataURL(blob);
  });

/** 상품 상세: 내 사진으로 AI 가상 피팅 (회원·하루 FITTING_DAILY회, 사진은 저장하지 않음) */
export default function VirtualFitting({ productId, slug }: { productId: number; slug: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState(""); // data URI (이 화면에만 있음)
  const [agree, setAgree] = useState(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const [result, setResult] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/fitting", { cache: "no-store" }).then((r) => r.json()).then(setInfo).catch(() => setInfo({ enabled: false }));
  }, []);

  // 결과 나올 때까지 3초마다 확인
  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    const started = Date.now();
    const tick = async () => {
      if (stop) return;
      try {
        const d = await (await fetch(`/api/fitting/status?id=${jobId}`, { cache: "no-store" })).json();
        if (d.status === "completed" && d.output) { setResult(d.output); setJobId(null); setBusy(false); return; }
        if (d.status === "failed") {
          setMsg(d.error); setJobId(null); setBusy(false);
          setInfo((i) => (i ? { ...i, left: (i.left ?? 0) + 1 } : i)); // 실패는 횟수 차감 안 함
          return;
        }
      } catch {}
      if (Date.now() - started > 3 * 60 * 1000) { setMsg("시간이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요."); setJobId(null); setBusy(false); return; }
      setTimeout(tick, 3000);
    };
    setTimeout(tick, 4000);
    return () => { stop = true; };
  }, [jobId]);

  if (!info?.enabled) return null; // 키 등록 전에는 버튼 자체를 숨김

  async function pick(file: File | undefined) {
    if (!file) return;
    setMsg("");
    try {
      const { blob } = await shrink(file);
      setPhoto(await toDataUri(blob));
      setResult("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "사진을 읽지 못했어요.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function run() {
    setMsg("");
    if (!photo) return setMsg("사진을 먼저 골라 주세요.");
    if (!agree) return setMsg("사진 이용에 동의해 주세요.");
    setBusy(true);
    setResult("");
    try {
      const r = await fetch("/api/fitting", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, photo, agree }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.message || "가상 피팅을 시작하지 못했어요."); setBusy(false); return; }
      setInfo((i) => (i ? { ...i, left: Math.max(0, (i.left ?? 1) - 1) } : i));
      setJobId(d.jobId);
    } catch {
      setMsg("네트워크 오류가 발생했어요."); setBusy(false);
    }
  }

  return (
    <div className="fitting">
      <button type="button" className="fitting-open" onClick={() => setOpen(true)}>
        <b>✨ AI 가상 피팅</b>
        <span className="small">내 사진으로 이 옷을 입어 보세요</span>
      </button>

      {open && (
        <div className="fitting-modal" role="dialog" aria-modal="true" onClick={() => !busy && setOpen(false)}>
          <div className="fitting-panel" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <b>AI 가상 피팅</b>
              <button type="button" className="link" onClick={() => setOpen(false)} disabled={busy}>닫기</button>
            </div>

            {!info.member ? (
              <div className="fitting-login">
                <p>가상 피팅은 회원 전용이에요. 하루 {FITTING_DAILY}번 무료로 입어 볼 수 있어요.</p>
                <Link href={`/login?next=/product/${slug}`} className="btn block">로그인하고 입어보기</Link>
              </div>
            ) : info.blocked ? (
              <p className="fitting-blocked">{info.blocked}</p>
            ) : (
              <>
                <p className="small muted" style={{ margin: 0 }}>오늘 남은 횟수 <b>{info.left ?? 0}</b> / {FITTING_DAILY}</p>

                {result ? (
                  <div className="fitting-result">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={result} alt="가상 피팅 결과" />
                    <p className="small muted">AI가 만든 예시 이미지라 실제 핏·색감과 다를 수 있어요. 사이즈는 실측표와 리뷰를 함께 확인해 주세요.</p>
                    <div className="row">
                      <a href={result} target="_blank" rel="noreferrer" className="btn outline">크게 보기·저장</a>
                      <button type="button" className="btn" onClick={() => { setResult(""); setPhoto(""); }}>다른 사진으로</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button type="button" className={`fitting-photo${photo ? " has" : ""}`} onClick={() => !busy && fileRef.current?.click()}>
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt="내 사진" />
                      ) : (
                        <span>＋ 내 사진 고르기<br /><small className="muted">정면 전신 사진, 몸에 붙는 옷일수록 정확해요</small></span>
                      )}
                      {busy && <div className="upload-busy">입혀 보는 중… (10~30초)</div>}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
                    <label className="check small">
                      <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                      <span>사진은 가상 피팅 이미지를 만드는 데에만 쓰이고 저희 서버에 저장하지 않아요. 이미지 생성을 위해 AI 업체(FASHN, 해외)로 전송되며 생성 후 자동 삭제돼요. 동의합니다.</span>
                    </label>
                    <button type="button" className="btn block" onClick={run} disabled={busy || !photo || (info.left ?? 0) <= 0}>
                      {(info.left ?? 0) <= 0 ? "오늘 횟수를 다 썼어요" : busy ? "입혀 보는 중…" : "입어 보기"}
                    </button>
                  </>
                )}
                {msg && <p className="error small" style={{ margin: 0 }}>{msg}</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
