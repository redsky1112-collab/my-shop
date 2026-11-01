import ActionForm, { SubmitButton } from "@/components/ActionForm";
import { customerCancel } from "./actions";

/** 배송 전 주문 취소 (전액 환불) */
export default function CancelButton({ orderNo, phone, paid }: { orderNo: string; phone?: string; paid: boolean }) {
  return (
    <details className="cancel-box">
      <summary className="link">주문 취소</summary>
      <ActionForm action={customerCancel} className="form">
        <input type="hidden" name="orderNo" value={orderNo} />
        {phone && <input type="hidden" name="phone" value={phone} />}
        <p className="small muted" style={{ margin: 0 }}>
          {paid ? "결제하신 수단으로 전액 환불돼요. 카드는 카드사에 따라 영업일 기준 3~7일 걸릴 수 있어요." : "결제 전 주문이라 바로 취소돼요."}
        </p>
        <label className="check"><input type="checkbox" required /> 이 주문을 취소할게요</label>
        <SubmitButton>주문 취소하기</SubmitButton>
      </ActionForm>
    </details>
  );
}
