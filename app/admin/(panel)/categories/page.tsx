import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { addCategory } from "../../actions";

export default async function Categories() {
  await requireAdmin();
  const cats = await prisma.category.findMany({ orderBy: { sort: "asc" }, include: { _count: { select: { products: true } } } });
  return (
    <>
      <h1 className="page-title">카테고리</h1>
      <table className="table">
        <thead><tr><th>순서</th><th>이름</th><th>slug</th><th>성인</th><th>상품 수</th></tr></thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c.id}><td>{c.sort}</td><td>{c.name}</td><td>{c.slug}</td><td>{c.adultOnly ? "19" : ""}</td><td>{c._count.products}</td></tr>
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
