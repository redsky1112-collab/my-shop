"use client";

import { useEffect, useRef, useState } from "react";

/* 토스페이먼츠 결제위젯 v2 (https://docs.tosspayments.com) */
type Widgets = {
  setAmount: (a: { currency: "KRW"; value: number }) => Promise<void>;
  renderPaymentMethods: (o: { selector: string; variantKey?: string }) => Promise<unknown>;
  renderAgreement: (o: { selector: string; variantKey?: string }) => Promise<unknown>;
  requestPayment: (o: Record<string, unknown>) => Promise<void>;
};
declare global {
  interface Window {
    TossPayments?: ((clientKey: string) => { widgets: (o: { customerKey: string }) => Widgets }) & { ANONYMOUS: string };
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("결제 모듈을 불러오지 못했어요."));
    document.head.appendChild(s);
  });
}

export default function PaymentWidget(props: {
  clientKey: string; orderNo: string; orderName: string; amount: number;
  customerName: string; customerEmail: string; customerMobilePhone: string;
}) {
  const widgets = useRef<Widgets | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadScript("https://js.tosspayments.com/v2/standard");
        if (cancelled || !window.TossPayments) return;
        const tp = window.TossPayments(props.clientKey);
        const w = tp.widgets({ customerKey: window.TossPayments.ANONYMOUS });
        await w.setAmount({ currency: "KRW", value: props.amount });
        await Promise.all([
          w.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
          w.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
        ]);
        widgets.current = w;
        setReady(true);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "결제 모듈 오류");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.clientKey, props.amount]);

  const pay = async () => {
    if (!widgets.current) return;
    const origin = window.location.origin;
    try {
      await widgets.current.requestPayment({
        orderId: props.orderNo,
        orderName: props.orderName,
        successUrl: `${origin}/api/pay/confirm`,
        failUrl: `${origin}/pay/fail?orderNo=${props.orderNo}`,
        customerName: props.customerName,
        customerEmail: props.customerEmail,
        customerMobilePhone: props.customerMobilePhone,
      });
    } catch (e) {
      // 사용자가 결제창을 닫은 경우 등
      setErr(e instanceof Error ? e.message : "결제가 취소되었어요.");
    }
  };

  return (
    <div className="pay-box">
      <div id="payment-method" />
      <div id="agreement" />
      {err && <p className="error">{err}</p>}
      <button className="btn block" disabled={!ready} onClick={pay}>
        {ready ? "결제하기" : "결제 모듈 불러오는 중..."}
      </button>
    </div>
  );
}
