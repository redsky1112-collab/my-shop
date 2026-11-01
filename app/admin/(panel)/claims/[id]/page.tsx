import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { won } from "@/lib/format";
import { CLAIM_STATUS, CLAIM_TYPES, parseLines, reasonOf, returnFee } from "@/lib/claims";
import ActionForm, { SubmitButton } from "@/components/ActionForm";
import TrackLink from "@/components/TrackLink";
import { completeExchange, refundClaim, updateClaim } from "../../../actions";

export default async function ClaimDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { saved } = await searchParams;
  const c = await prisma.claim.findUnique({
    where: { id: Number(id) },
    include: { order: { include: { items: { include: { product: { include: { variants: true } } } } } } },
  });
  if (!c) notFound();
  const o = c.order;
  const byId = new Map(o.items.map((i) => [i.id, i]));
  const lines = parseLines(c.items);
  const done = c.status === "COMPLETED" || c.status === "REJECTED";
  const amount = lines.reduce((s, l) => s + (byId.get(l.itemId)?.price ?? 0) * l.qty, 0);
  const fee = c.sellerFault ? 0 : returnFee(o.shippingFee);

  return (
    <>
      <Link href="/admin/claims" className="link">← 교환·반품 목록</Link>
      <h1 className="page-title">{CLAIM_TYPES[c.type as "RETURN" | "EXCHANGE"]} 신청 · {CLAIM_STATUS[c.status]}</h1>
      {saved && <p className="form-ok">저장했어요.</p>}

      <div className="summary">
        <div><span>주문</span><Link href={`/admin/orders/${o.id}`} className="link">{o.orderNo}</Link></div>
        <div><span>주문자</span><span>{o.buyerName} {o.buyerPhone}</span></div>
        <div><span>회수 주소</span><span>[{o.zipcode}] {o.address1} {o.address2} ({o.recipient} {o.phone})</span></div>
        <div><span>사유</span><b className={c.sellerFault ? "out" : ""}>{reasonOf(c.reason)?.label ?? c.reason} · {c.sellerFault ? "판매자 책임(배송비 무료)" : `고객 부담 배송비 ${won(fee)}`}</b></div>
        <div><span>접수</span><span>{c.createdAt.toLocaleString("ko-KR")}</span></div>
      </div>

      <h3>상품</h3>
      <ul className="cart-list">
        {lines.map((l) => {
          const it = byId.get(l.itemId);
          if (!it) return null;
          const v = it.product.variants.find((x) => x.option === l.toOption);
          return (
            <li key={l.itemId} className="cart-item">
              <div className="grow">
                <b>{it.name}{it.option && ` (${it.option})`} × {l.qty}</b>
                <span className="small muted">{won(it.price * l.qty)}</span>
                {c.type === "EXCHANGE" && l.toOption && (
                  <span>→ <b>{l.toOption}</b>로 교환 <span className={`small ${(v?.stock ?? 0) < l.qty ? "out" : "muted"}`}>(현재 재고 {v?.stock ?? 0})</span></span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {c.detail && <p className="desc-short">“{c.detail}”</p>}
      {c.photos && (
        <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-start" }}>
          {c.photos.split(",").map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <a key={u} href={u} target="_blank" className="claim-photo"><img src={u} alt="고객 첨부 사진" /></a>
          ))}
        </div>
      )}

      {!done && (
        <>
          <ActionForm action={updateClaim} className="form refund">
            <h3>진행 상태</h3>
            <input type="hidden" name="id" value={c.id} />
            <select name="status" defaultValue={c.status}>
              <option value="REQUESTED">접수</option>
              <option value="APPROVED">승인 · 회수 예정</option>
              <option value="COLLECTING">회수중</option>
              <option value="REJECTED">거절</option>
            </select>
            <input name="returnTrackingNo" defaultValue={c.returnTrackingNo} placeholder="회수 송장번호 (선택)" />
            <textarea name="adminMemo" rows={2} defaultValue={c.adminMemo} placeholder="고객에게 보일 안내 (예: 3일 안에 기사님이 방문해요 / 거절 사유)" />
            <SubmitButton>상태 저장</SubmitButton>
          </ActionForm>

          {c.type === "RETURN" ? (
            <ActionForm action={refundClaim} className="form refund">
              <h3>반품 완료 · 환불</h3>
              <p className="small muted" style={{ margin: 0 }}>상품을 받아 검수한 뒤 진행하세요. 상품 금액 {won(amount)} 기준이며, 아래 차감액을 뺀 금액이 결제 수단으로 환불돼요.</p>
              <input type="hidden" name="id" value={c.id} />
              <label>환불금에서 뺄 금액 (고객 부담 반품 배송비)
                <input name="deduct" type="number" min={0} step={500} defaultValue={fee} inputMode="numeric" />
              </label>
              {c.sellerFault && o.shippingFee > 0 && !o.shippingRefunded && (
                <label className="check"><input type="checkbox" name="refundShipping" defaultChecked /> 처음 낸 배송비 {won(o.shippingFee)}도 환불</label>
              )}
              <label className="check"><input type="checkbox" name="restock" defaultChecked={!c.sellerFault} /> 재고 되돌리기 (불량이면 해제)</label>
              <input name="adminMemo" placeholder="고객 안내 (비우면 '○○원 환불 완료')" />
              <label className="check"><input type="checkbox" required /> 검수를 마쳤고 환불을 진행할게요 (되돌릴 수 없어요)</label>
              <SubmitButton>환불하고 반품 완료</SubmitButton>
            </ActionForm>
          ) : (
            <ActionForm action={completeExchange} className="form refund">
              <h3>교환 상품 발송 · 완료</h3>
              <p className="small muted" style={{ margin: 0 }}>
                회수 상품을 확인한 뒤 새 사이즈를 보내고 송장을 적어 주세요. 새 사이즈 재고가 자동으로 줄어요.
                {!c.sellerFault && ` 고객 부담 왕복 배송비 ${won(returnFee(0))}는 동봉 또는 입금으로 받아 주세요.`}
              </p>
              <input type="hidden" name="id" value={c.id} />
              <input name="resendTrackingNo" required placeholder="교환 상품 발송 송장번호" />
              <label className="check"><input type="checkbox" name="restock" defaultChecked={!c.sellerFault} /> 회수한 상품 재고 되돌리기 (불량이면 해제)</label>
              <input name="adminMemo" placeholder="고객 안내 (비우면 '교환 상품을 보내 드렸어요.')" />
              <SubmitButton>교환 완료</SubmitButton>
            </ActionForm>
          )}
        </>
      )}
      {done && c.adminMemo && <p className="claim-memo">안내: {c.adminMemo}</p>}
      {c.returnTrackingNo && <p><TrackLink courier={o.courier} trackingNo={c.returnTrackingNo} label="회수 조회" /></p>}
      {c.resendTrackingNo && <p><TrackLink courier={o.courier} trackingNo={c.resendTrackingNo} label="교환 발송 조회" /></p>}
    </>
  );
}
