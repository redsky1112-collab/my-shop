import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { addCategory, updateCategory } from "../../actions";

export default async function Categories() {
  await requireAdmin();
  const cats = await prisma.category.findMany({ orderBy: { sort: "asc" }, include: { _count: { select: { products: true } } } });
  return (
    <>
      <h1 className="page-title">카테고리</h1>
      <table className="table">
        <thead><tr><th>이름 · 메뉴 표시명 · 순서 (수정 후 저장)</th><th>slug</th><th>성인</th><th>상품 수</th></tr></thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c.id}>
              <td>
                <form action={updateCategory} className="inline-form">
                  <input type="hidden" name="id" value={c.id} />
                  <input name="name" defaultValue={c.name} required aria-label="이름" />
                  <input name="menuName" defaultValue={c.menuName} placeholder="메뉴용 짧은 이름" aria-label="메뉴 표시명" />
                  <input name="sort" type="number" defaultValue={c.sort} style={{ width: 64 }} aria-label="순서" />
                  <button className="btn small">저장</button>
                </form>
              </td>
              <td>{c.slug}</td><td>{c.adultOnly ? "19" : ""}</td><td>{c._count.products}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>카테고리 추가</h3>
      <form action={addCategory} className="form">
        <div className="row">
          <input name="name" placeholder="이름" required />
          <input name="slug" placeholder="영문 slug" required />
          <input name="sort" type="number" placeholder="순서" defaultValue={10} />
        </div>
        <label className="check"><input type="checkbox" name="adultOnly" /> 성인 카테고리</label>
        <button className="btn">추가</button>
      </form>
    </>
  );
}
