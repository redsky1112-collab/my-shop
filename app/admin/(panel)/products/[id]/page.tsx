import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import ProductForm from "../ProductForm";
import ActionForm from "@/components/ActionForm";
import { activateProduct, deactivateProduct, deleteProduct } from "../../../actions";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const p = await prisma.product.findUnique({ where: { id: Number(id) }, include: { variants: true, category: true, _count: { select: { orderItems: true } } } });
  if (!p) notFound();
  return (
    <>
      <h1 className="page-title">상품 수정</h1>
      {!(p.adultOnly || p.category.adultOnly) && (
        <Link href={`/admin/products/${p.id}/ai`} className="ai-entry">
          <b>✨ AI 화보 · 가상 피팅</b>
          <span>옷 사진으로 모델 착용컷 만들기 · 가상 피팅용 사진 지정 →</span>
        </Link>
      )}
      <ProductForm p={p} />

      <div className="danger-zone">
        <h3>판매 상태 · 삭제</h3>
        <div className="row between">
          <span>지금: <b>{p.active ? "판매중" : "판매중지"}</b></span>
          <form action={p.active ? deactivateProduct : activateProduct}>
            <input type="hidden" name="id" value={p.id} />
            <button className="btn small outline">{p.active ? "판매중지(숨기기)" : "판매 재개"}</button>
          </form>
        </div>
        {p._count.orderItems > 0 ? (
          <p className="small muted">주문 기록({p._count.orderItems}건)이 있어 삭제할 수 없어요. 판매중지로 숨겨 주세요. (주문 기록은 법정 보관 대상)</p>
        ) : (
          <ActionForm action={deleteProduct} className="danger-form">
            <input type="hidden" name="id" value={p.id} />
            <label className="check"><input type="checkbox" name="confirm" value="1" /> 삭제할게요 (되돌릴 수 없어요 · 사이즈 재고·찜·리뷰도 함께 삭제)</label>
            <button className="btn small danger">상품 삭제</button>
          </ActionForm>
        )}
        <p><Link href="/admin/products" className="link small">← 상품 목록</Link></p>
      </div>
    </>
  );
}
