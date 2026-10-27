import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLooks() {
  await requireAdmin();
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
      <table className="table">
        <thead><tr><th>코디명</th><th>상품</th><th>상태</th></tr></thead>
        <tbody>
          {looks.map((l) => (
            <tr key={l.id}>
              <td><Link href={`/admin/looks/${l.id}`}>{l.title}</Link></td>
              <td>{l.items.map((i) => i.product.name).join(" + ")}</td>
              <td>{l.active ? "노출" : "숨김"}</td>
            </tr>
          ))}
          {looks.length === 0 && <tr><td colSpan={3} className="muted">등록된 코디가 없어요.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
