import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { setLookActive } from "../../actions";

export default async function AdminLooks({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireAdmin();
  const { deleted } = await searchParams;
  const looks = await prisma.look.findMany({
    include: { items: { include: { product: true }, orderBy: { sort: "asc" } } },
    orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
  });
  return (
    <>
      <div className="row between">
        <h1 className="page-title">코디</h1>
        <Link href="/admin/looks/new" className="btn">코디 등록</Link>
      </div>
      {deleted && <p className="form-ok">코디를 삭제했어요. (묶여 있던 상품은 그대로예요)</p>}
      <table className="table">
        <thead><tr><th>코디명</th><th>상품</th><th>상태</th></tr></thead>
        <tbody>
          {looks.map((l) => (
            <tr key={l.id}>
              <td>
                <Link href={`/admin/looks/${l.id}`} className="link">{l.title}</Link>
                <div style={{ marginTop: 6 }}><Link href={`/admin/looks/${l.id}`} className="btn small outline">수정·삭제</Link></div>
              </td>
              <td>{l.items.map((i) => i.product.name).join(" + ")}</td>
              <td>
                {l.active ? "노출" : "숨김"}
                <form action={setLookActive}>
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="on" value={l.active ? "0" : "1"} />
                  <button className="link small">{l.active ? "숨기기" : "다시 노출"}</button>
                </form>
              </td>
            </tr>
          ))}
          {looks.length === 0 && <tr><td colSpan={3} className="muted">등록된 코디가 없어요.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
