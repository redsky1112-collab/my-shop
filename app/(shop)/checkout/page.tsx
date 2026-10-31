"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { won, shippingFor } from "@/lib/format";
import { GIFT, SHIPPING } from "@/lib/site";

declare global {
  interface Window {
    daum?: { Postcode: new (o: { oncomplete: (d: { zonecode: string; roadAddress: string; jibunAddress: string }) => void }) => { open: () => void } };
  }
}

export default function CheckoutPage() {
  const { items } = useCart();
  const router = useRouter();
  const [f, setF] = useState({
    buyerName: "", buyerPhone: "", buyerEmail: "",
    recipient: "", phone: "", zipcode: "", address1: "", address2: "", memo: "",
  });
  const [same, setSame] = useState(true);
  const [agree, setAgree] = useState(false);
  const [gift, setGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [member, setMember] = useState<boolean | null>(null);

  // 로그인 회원이면 주문자 정보 자동 채우기 (이미 입력한 칸은 덮어쓰지 않음)
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(({ user }) => {
        setMember(!!user);
        if (user) setF((p) => ({
          ...p,
          buyerName: p.buyerName || user.name || "",
          buyerEmail: p.buyerEmail || user.email || "",
          buyerPhone: p.buyerPhone || user.phone || "",
        }));
      })
      .catch(() => setMember(false));
  }, []);

  const itemsTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const ship = shippingFor(itemsTotal, SHIPPING.fee, SHIPPING.freeOver);
  const giftFee = gift ? GIFT.fee : 0;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const findAddr = () => {
    if (!window.daum) return;
    new window.daum.Postcode({
      oncomplete: (d) => setF((p) => ({ ...p, zipcode: d.zonecode, address1: d.roadAddress || d.jibunAddress })),
    }).open();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!agree) return setErr("구매조건 및 개인정보 수집·이용에 동의해 주세요.");
    const body = {
      ...f,
      recipient: same ? f.buyerName : f.recipient,
      phone: same ? f.buyerPhone : f.phone,
      giftWrap: gift,
      giftMessage: gift ? giftMessage : "",
      items: items.map((i) => ({ productId: i.productId, option: i.option, quantity: i.quantity })),
    };
    setBusy(true);
    try {
      const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.status === 403 && data.code === "ADULT_REQUIRED") return router.push("/adult-verify?next=/checkout");
      if (!res.ok) return setErr(data.message || "주문 생성에 실패했어요.");
      router.push(`/pay/${data.orderNo}`);
    } catch {
      setErr("네트워크 오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  };

  if (items.length === 0) return <p className="empty">장바구니가 비어 있어요.</p>;

  return (
    <>
      <Script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
      <h1 className="page-title">주문서</h1>
      {member === false && (
        <p className="small muted">
          <Link href="/login?next=/checkout" className="link">로그인</Link>하면 정보가 자동으로 채워지고 마이페이지에서 주문 내역을 볼 수 있어요. (비회원 주문도 가능)
        </p>
      )}
      <form className="form" onSubmit={submit}>
        <h3>주문자</h3>
        <input required placeholder="이름" value={f.buyerName} onChange={set("buyerName")} />
        <input required placeholder="휴대폰 (숫자만)" inputMode="numeric" value={f.buyerPhone} onChange={set("buyerPhone")} />
        <input required type="email" placeholder="이메일" value={f.buyerEmail} onChange={set("buyerEmail")} />

        <h3>배송지</h3>
        <label className="check"><input type="checkbox" checked={same} onChange={(e) => setSame(e.target.checked)} /> 주문자와 동일</label>
        {!same && (
          <>
            <input required placeholder="받는 분" value={f.recipient} onChange={set("recipient")} />
            <input required placeholder="받는 분 휴대폰" inputMode="numeric" value={f.phone} onChange={set("phone")} />
          </>
        )}
        <div className="row">
          <input required readOnly placeholder="우편번호" value={f.zipcode} onClick={findAddr} />
          <button type="button" className="btn outline" onClick={findAddr}>주소 찾기</button>
        </div>
        <input required readOnly placeholder="기본주소" value={f.address1} onClick={findAddr} />
        <input placeholder="상세주소" value={f.address2} onChange={set("address2")} />
        <input placeholder="배송 메모 (선택)" value={f.memo} onChange={set("memo")} />

        <h3>포장</h3>
        <div className="gift-options">
          <label className={`gift-opt${!gift ? " on" : ""}`}>
            <input type="radio" name="gift" checked={!gift} onChange={() => setGift(false)} />
            <span><b>기본 포장</b><span className="small muted">듀오로그 기본 포장 · 무료</span></span>
          </label>
          <label className={`gift-opt${gift ? " on" : ""}`}>
            <input type="radio" name="gift" checked={gift} onChange={() => setGift(true)} />
            <span><b>{GIFT.title} +{won(GIFT.fee)}</b><span className="small muted">{GIFT.desc}</span></span>
          </label>
        </div>
        {gift && (
          <>
            <p className="gift-note small">{GIFT.note}<br />{GIFT.receiptNote}<br />선물 포장비 {won(GIFT.fee)}이 결제금액에 추가돼요.</p>
            <textarea
              rows={3}
              maxLength={GIFT.messageMax}
              placeholder={`메시지 카드에 담을 말 (선택, ${GIFT.messageMax}자 이내)`}
              value={giftMessage}
              onChange={(e) => setGiftMessage(e.target.value)}
            />
          </>
        )}

        <div className="summary">
          <div><span>상품금액</span><span>{won(itemsTotal)}</span></div>
          <div><span>배송비</span><span>{ship ? won(ship) : "무료"}</span></div>
          {gift && <div><span>선물 포장</span><span>{won(giftFee)}</span></div>}
          <div className="total"><span>결제금액</span><span>{won(itemsTotal + ship + giftFee)}</span></div>
        </div>
        <label className="check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          주문 상품 정보 및 구매조건을 확인했으며, 개인정보 수집·이용에 동의합니다. (필수)
        </label>
        {err && <p className="error">{err}</p>}
        <button className="btn block" disabled={busy}>{busy ? "처리 중..." : "결제하기"}</button>
      </form>
    </>
  );
}
