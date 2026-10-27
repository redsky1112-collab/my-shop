"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    PortOne?: {
      requestIdentityVerification: (o: Record<string, unknown>) => Promise<{ code?: string; message?: string; identityVerificationId?: string } | undefined>;
    };
  }
}

function loadSdk() {
  return new Promise<void>((resolve, reject) => {
    if (window.PortOne) return resolve();
    const s = document.createElement("script");
    s.src = "https://cdn.portone.io/v2/browser-sdk.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("인증 모듈 로드 실패"));
    document.head.appendChild(s);
  });
}

export default function AdultVerify({ mode, next, storeId, channelKey }: { mode: string; next: string; storeId: string; channelKey: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = async (identityVerificationId: string) => {
    setBusy(true);
    const res = await fetch("/api/adult/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identityVerificationId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(data.message || "인증에 실패했어요.");
    router.replace(next);
    router.refresh();
  };

  // 모바일은 인증 후 redirectUrl로 돌아오므로 쿼리에서 처리
  useEffect(() => {
    const id = sp.get("identityVerificationId");
    if (id && !sp.get("code")) finish(id);
    else if (sp.get("code")) setErr(sp.get("message") || "인증이 취소되었어요.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPortone = async () => {
    setErr("");
    try {
      await loadSdk();
      const id = `idv-${crypto.randomUUID()}`;
      const r = await window.PortOne!.requestIdentityVerification({
        storeId,
        identityVerificationId: id,
        channelKey,
        redirectUrl: `${window.location.origin}/adult-verify?next=${encodeURIComponent(next)}`,
      });
      if (r?.code) return setErr(r.message || "인증이 취소되었어요.");
      await finish(id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "인증 오류");
    }
  };

  const startMock = async () => {
    setBusy(true);
    const res = await fetch("/api/adult/mock", { method: "POST" });
    setBusy(false);
    if (!res.ok) return setErr("개발용 인증을 사용할 수 없어요.");
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="gate-actions">
      {mode === "portone" && (
        <button className="btn block" disabled={busy} onClick={startPortone}>휴대폰 본인인증</button>
      )}
      {mode === "mock" && (
        <>
          <button className="btn block" disabled={busy} onClick={startMock}>[개발용] 인증 통과</button>
          <p className="muted small">개발 모드 전용 버튼이에요. 운영 배포에서는 자동으로 비활성화돼요.</p>
        </>
      )}
      {mode === "disabled" && <p className="error">본인인증이 설정되지 않았어요. 관리자에게 문의해 주세요.</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
