"use client";

import { useState } from "react";
import ActionForm, { SubmitButton } from "@/components/ActionForm";
import { refundOrder } from "../../../actions";
import { won } from "@/lib/format";

type Item = { id: number; name: string; option: string; price: number; quantity: number; remain: number };

const REASONS = ["고객 단순 변심", "사이즈 교환 불가(재고 없음)", "상품 불량", "오배송", "품절로 발송 불가", "고객 주문 취소 요청"];

export default function RefundForm({
  orderId, paid, balance, shippingFee, items,
}: { orderId: number; paid: boolean; balance: number; shippingFee: number; items: Item[] }) {
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [qty, setQty] = useState<Record<number, number>>({});
  const [ship, setShip] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [restock, setRestock] = useState(true);

  const itemsAmount = items.reduce((s, i) => s + i.price * (qty[i.id] ?? 0), 0);
  const allSelected = items.every((i) => (qty[i.id] ?? 0) >= i.remain);
  const amount = mode === "full" || allSelected ? balance : Math.min(balance, itemsAmount + (ship ? shippingFee : 0));

  return (
    <ActionForm action={refundOrder} className="form refund">
      <h3>{paid ? "결제 취소·환불" : "주문 취소 (결제 전)"}</h3>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="mode" value={mode} />

      {paid && (
        <div className="chips">
          <button type="button" className={`chip${mode === "full" ? " on" : ""}`} onClick={() => setMode("full")}>전체 취소</button>
          <button type="button" className={`chip${mode === "partial" ? " on" : ""}`} onClick={() => setMode("partial")}>일부 상품만 취소</button>
        </div>
      )}

      {mode === "partial" && (
        <div className="refund-items">
          {items.map((i) => (
            <div key={i.id} className={`refund-item${i.remain === 0 ? " done" : ""}`}>
              <span>{i.name}{i.option && ` (${i.option})`} · {won(i.price)}</span>
              {i.remain === 0 ? <span className="small muted">취소됨</span> : (
                <span className="row" style={{ gap: 6 }}>
                  <input type="hidden" name="itemId" value={i.id} />
                  <input name="qty" type="number" min={0} max={i.remain} value={qty[i.id] ?? 0} inputMode="numeric"
                    onChange={(e) => setQty({ ...qty, [i.id]: Math.max(0, Math.min(i.remain, Math.floor(Number(e.target.value) || 0))) })} />
                  <span className="small muted">/ {i.remain}개</span>
                </span>
              )}
            </div>
          ))}
          {shippingFee > 0 && (
            <label className="check"><input type="checkbox" name="refundShipping" checked={ship} onChange={(e) => setShip(e.target.checked)} /> 배송비 {won(shippingFee)}도 환불 (불량·오배송 등 판매자 책임일 때)</label>
          )}
        </div>
      )}

      <label>사유
        <select name="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((r) => <option key={r}>{r}</option>)}
        </select>
      </label>
      <label className="check">
        <input type="checkbox" name="restock" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
        재고 되돌리기 (불량·훼손으로 다시 팔 수 없으면 해제)
      </label>

      {paid && (
        <p className="refund-total">
          환불 금액 <b>{won(amount)}</b>
          {mode === "full" && " (남은 결제금액 전액)"}
          {mode === "partial" && allSelected && " (남은 상품 전부라 전체 취소로 처리)"}
        </p>
      )}
      <label className="check"><input type="checkbox" required /> 위 내용으로 {paid ? "환불" : "취소"}하는 것을 확인했어요 (되돌릴 수 없어요)</label>
      <SubmitButton>{paid ? `${won(amount)} 환불하기` : "주문 취소"}</SubmitButton>
    </ActionForm>
  );
}
