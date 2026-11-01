"use client";

import { useState } from "react";

/** 품절 옵션 재입고 알림 신청 (soldOut: 품절 옵션 목록, 옵션 없는 상품이면 [""]) */
export default function RestockForm({ productId, soldOut }: { productId: number; soldOut: string[] }) {
  const [open, setOpen] = useState(false);
  const [option, setOption] = useState(soldOut.length === 1 ? soldOut[0] : "");
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const hasOptions = !(soldOut.length === 1 && soldOut[0] === "");

  if (soldOut.length === 0) return null;

  async function openForm() {
    setOpen(true);
    if (phone) return;
    // 회원이면 휴대폰 번호 미리 채우기
    try {
      const { user } = await (await fetch("/api/me", { cache: "no-store" })).json();
      if (user?.phone) setPhone((p) => p || user.phone);
    } catch {}
  }

  async function submit() {
    setMsg("");
    if (hasOptions && !option) return setMsg("알림 받을 사이즈를 골라 주세요.");
    if (!agree) return setMsg("알림 수신에 동의해 주세요.");
    setBusy(true);
    try {
      const r = await fetch("/api/restock", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, option: hasOptions ? option : "", phone, agree }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(d.message || "신청에 실패했어요.");
      setDone(true);
    } catch {
      setMsg("네트워크 오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="restock-done">
        재입고 알림을 신청했어요{hasOptions && option ? ` (${option})` : ""}. 입고되면 문자로 가장 먼저 알려 드릴게요.
      </p>
    );
  }

  return (
    <div className="restock">
      {!open ? (
        <button type="button" className="btn outline block" onClick={openForm}>
          {hasOptions ? `품절 사이즈(${soldOut.join(", ")}) 재입고 알림 받기` : "재입고 알림 받기"}
        </button>
      ) : (
        <div className="restock-form">
          <b>재입고 알림 신청</b>
          {hasOptions && (
            <div className="chips">
              {soldOut.map((o) => (
                <button key={o} type="button" className={`chip${option === o ? " on" : ""}`} onClick={() => setOption(o)}>{o}</button>
              ))}
            </div>
          )}
          <input placeholder="휴대폰 번호 (숫자만)" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <label className="check small">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            재입고 알림 문자 수신에 동의해요 (알림 1회 후 자동 종료, 번호는 알림 목적으로만 사용)
          </label>
          {msg && <p className="error small" style={{ margin: 0 }}>{msg}</p>}
          <div className="row">
            <button type="button" className="btn outline" onClick={() => setOpen(false)}>닫기</button>
            <button type="button" className="btn" onClick={submit} disabled={busy}>{busy ? "신청 중…" : "알림 신청"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
