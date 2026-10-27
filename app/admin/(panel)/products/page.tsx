import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { won } from "@/lib/format";
import { deactivateProduct } from "../../actions";

export default async function Products() {
  await requireAdmin();
  const list = await prisma.product.findMany({ include: { category: true }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <div className="row between">
        <h1 className="page-title">상품</h1>
        <Link href="/admin/products/new" className="btn">상품 등록</Link>
      </div>
      <table className="table">
        <thead><tr><th>상품명</th><th>카테고리</th><th>가격</th><th>재고</th><th>상태</th><th></th></tr></thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/admin/products/${p.id}`}>{p.name}</Link>{(p.adultOnly || p.category.adultOnly) && <span className="r19-mini">19</span>}</td>
              <td>{p.category.name}</td>
              <td>{won(p.salePrice ?? p.price)}</td>
              <td>{p.stock}</td>
              <td>{p.active ? "판매중" : "중지"}</td>
              <td>
                {p.active && (
                  <form action={deactivateProduct}><input type="hidden" name="id" value={p.id} /><button className="link">판매중지</button></form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
