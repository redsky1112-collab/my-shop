import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { won } from "@/lib/format";

export default async function Dashboard() {
  await requireAdmin();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [toShip, todayPaid, lowStock] = await Promise.all([
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.aggregate({ where: { paidAt: { gte: start } }, _sum: { total: true }, _count: true }),
    prisma.product.findMany({ where: { active: true, stock: { lte: 5 } }, orderBy: { stock: "asc" }, take: 10 }),
  ]);
  return (
    <>
      <div className="stats">
        <Link href="/admin/orders?status=PAID" className="stat"><span>배송 대기</span><b>{toShip}건</b></Link>
        <div className="stat"><span>오늘 결제</span><b>{todayPaid._count}건</b></div>
        <div className="stat"><span>오늘 매출</span><b>{won(todayPaid._sum.total || 0)}</b></div>
      </div>
      <h3>재고 부족 (5개 이하)</h3>
      <ul>
        {lowStock.map((p) => (
          <li key={p.id}><Link href={`/admin/products/${p.id}`}>{p.name}</Link> — {p.stock}개</li>
        ))}
        {lowStock.length === 0 && <li className="muted">없음</li>}
      </ul>
    </>
  );
}
