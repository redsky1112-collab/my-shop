import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { won } from "@/lib/format";
import { activateProduct, deactivateProduct } from "../../actions";

export default async function Products({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireAdmin();
  const { deleted } = await searchParams;
  const list = await prisma.product.findMany({ include: { category: true, variants: { orderBy: { sort: "asc" } } }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <div className="row between">
        <h1 className="page-title">상품</h1>
        <Link href="/admin/products/new" className="btn">상품 등록</Link>
      </div>
      {deleted && <p className="form-ok">상품을 삭제했어요.</p>}
      <p className="small muted">상품명을 누르거나 '수정'을 누르면 수정·삭제 화면으로 가요.</p>
      <table className="table">
        <thead><tr><th>상품명</th><th>카테고리</th><th>가격</th><th>재고</th><th>상태</th><th></th></tr></thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/admin/products/${p.id}`} className="link">{p.name}</Link>{(p.adultOnly || p.category.adultOnly) && <span className="r19-mini">19</span>}
                {!p.active && <span className="small out"> (중지)</span>}
                <div style={{ marginTop: 6 }}>
                  <Link href={`/admin/products/${p.id}`} className="btn small outline">수정·삭제</Link>
                </div>
              </td>
              <td>{p.category.name}</td>
              <td>{won(p.salePrice ?? p.price)}</td>
              <td>
                <b>{p.stock}</b>
                {p.variants.length > 0 && (
                  <div className="small muted">
                    {p.variants.map((v) => <span key={v.id} className={v.stock === 0 ? "out" : ""}>{v.option} {v.stock} </span>)}
                  </div>
                )}
              </td>
              <td>{p.active ? "판매중" : "중지"}</td>
              <td>
                {!(p.adultOnly || p.category.adultOnly) && <Link href={`/admin/products/${p.id}/ai`} className="ai-link">✨ AI 화보</Link>}
                {p.active ? (
                  <form action={deactivateProduct}><input type="hidden" name="id" value={p.id} /><button className="link">판매중지</button></form>
                ) : (
                  <form action={activateProduct}><input type="hidden" name="id" value={p.id} /><button className="link">판매 재개</button></form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
