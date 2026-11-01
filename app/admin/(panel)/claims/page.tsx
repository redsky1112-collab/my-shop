import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { CLAIM_STATUS, CLAIM_TYPES, parseLines, reasonOf } from "@/lib/claims";

export default async function Claims({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const where = status && CLAIM_STATUS[status] ? { status } : { status: { notIn: ["COMPLETED", "REJECTED"] } };
  const list = await prisma.claim.findMany({ where, include: { order: { include: { items: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <h1 className="page-title">교환·반품</h1>
      <nav className="tabs">
        <Link href="/admin/claims">처리 중</Link>
        {Object.entries(CLAIM_STATUS).map(([k, v]) => <Link key={k} href={`/admin/claims?status=${k}`}>{v}</Link>)}
      </nav>
      <table className="table">
        <thead><tr><th>접수</th><th>유형·사유</th><th>상품</th><th>주문자</th><th>상태</th></tr></thead>
        <tbody>
          {list.map((c) => {
            const byId = new Map(c.order.items.map((i) => [i.id, i]));
            return (
              <tr key={c.id}>
                <td><Link href={`/admin/claims/${c.id}`}>{c.createdAt.toLocaleDateString("ko-KR")}</Link><br /><span className="small muted">{c.order.orderNo}</span></td>
                <td><b>{CLAIM_TYPES[c.type as "RETURN" | "EXCHANGE"]}</b><br /><span className={`small ${c.sellerFault ? "out" : "muted"}`}>{reasonOf(c.reason)?.label ?? c.reason}{c.sellerFault && " · 판매자 책임"}</span></td>
                <td>{parseLines(c.items).map((l) => { const i = byId.get(l.itemId); return <div key={l.itemId} className="small">{i?.name}{i?.option && ` (${i.option})`} ×{l.qty}{l.toOption && ` → ${l.toOption}`}</div>; })}</td>
                <td>{c.order.buyerName}<br /><span className="small muted">{c.order.buyerPhone}</span></td>
                <td><Link href={`/admin/claims/${c.id}`} className="link">{CLAIM_STATUS[c.status]}</Link></td>
              </tr>
            );
          })}
          {list.length === 0 && <tr><td colSpan={5} className="muted">신청이 없어요.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
