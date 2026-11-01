import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { won } from "@/lib/format";
import { LINES } from "@/lib/lines";
import { availableFor } from "@/lib/stock";

export default async function Dashboard() {
  await requireAdmin();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [toShip, todayPaid, lowStock, lineCounts, openClaims] = await Promise.all([
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.aggregate({ where: { paidAt: { gte: start } }, _sum: { total: true }, _count: true }),
    // 사이즈별 재고 3개 이하 + 옵션 없는 상품 재고 5개 이하
    prisma.product.findMany({
      where: { active: true, OR: [{ variants: { some: { stock: { lte: 3 } } } }, { variants: { none: {} }, stock: { lte: 5 } }] },
      include: { variants: { where: { stock: { lte: 3 } }, orderBy: { sort: "asc" } } },
      orderBy: { stock: "asc" },
      take: 15,
    }),
    prisma.product.groupBy({
      by: ["line"],
      where: { active: true, adultOnly: false, category: { adultOnly: false } },
      _count: { _all: true },
    }),
    prisma.claim.count({ where: { status: { in: ["REQUESTED", "APPROVED", "COLLECTING"] } } }),
  ]);
  const cnt = (k: string) => lineCounts.find((c) => c.line === k)?._count._all ?? 0;
  const lined = LINES.reduce((s, l) => s + cnt(l.key), 0);
  const topWish = await prisma.wish.groupBy({
    by: ["productId"],
    _count: { _all: true },
    orderBy: { _count: { productId: "desc" } },
    take: 10,
  });
  const wishNames = new Map(
    (await prisma.product.findMany({ where: { id: { in: topWish.map((w) => w.productId) } }, select: { id: true, name: true } }))
      .map((p) => [p.id, p.name]),
  );

  // 재입고 알림: 재고가 다시 생긴 대기 신청 수
  const pendingAlerts = await prisma.restockAlert.findMany({
    where: { notifiedAt: null },
    select: { option: true, product: { select: { active: true, stock: true, variants: { select: { option: true, stock: true } } } } },
    take: 3000,
  });
  const restockReady = pendingAlerts.filter((a) => a.product.active && availableFor(a.product, a.option) > 0).length;

  return (
    <>
      <div className="stats">
        <Link href="/admin/orders?status=PAID" className="stat"><span>배송 대기</span><b>{toShip}건</b></Link>
        <Link href="/admin/claims" className="stat"><span>교환·반품 처리 중</span><b className={openClaims ? "out" : ""}>{openClaims}건</b></Link>
        <Link href="/admin/restock" className="stat"><span>재입고 알림 보낼 대상</span><b className={restockReady ? "out" : ""}>{restockReady}명</b></Link>
        <div className="stat"><span>오늘 결제</span><b>{todayPaid._count}건</b></div>
        <div className="stat"><span>오늘 매출</span><b>{won(todayPaid._sum.total || 0)}</b></div>
      </div>
      <h3>라인 구성 (판매중 상품 기준)</h3>
      <table className="table line-mix">
        <thead><tr><th>라인</th><th>상품 수</th><th>현재 비중</th><th>목표</th><th>상태</th></tr></thead>
        <tbody>
          {LINES.map((l) => {
            const n = cnt(l.key);
            const pct = lined ? Math.round((n / lined) * 100) : 0;
            const gap = pct - l.target;
            return (
              <tr key={l.key}>
                <td><Link href={`/line/${l.key}`}>{l.name}</Link></td>
                <td>{n}개</td>
                <td>
                  <div className="mix-bar"><div style={{ width: `${pct}%` }} /><i style={{ left: `${l.target}%` }} /></div>
                  {pct}%
                </td>
                <td>{l.target}%</td>
                <td>{!lined ? "-" : Math.abs(gap) <= 5 ? "✅ 적정" : gap < 0 ? `⬆ ${-gap}%p 부족` : `⬇ ${gap}%p 많음`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {cnt("") > 0 && <p className="small muted">라인 미지정 상품 {cnt("")}개 — 상품 수정에서 라인을 지정해 주세요.</p>}
      <h3>재고 부족 (사이즈별 3개 이하)</h3>
      <ul>
        {lowStock.map((p) => (
          <li key={p.id}>
            <Link href={`/admin/products/${p.id}`}>{p.name}</Link> —{" "}
            {p.variants.length > 0
              ? p.variants.map((v) => `${v.option} ${v.stock === 0 ? "품절" : `${v.stock}개`}`).join(" · ")
              : `${p.stock}개`}
          </li>
        ))}
        {lowStock.length === 0 && <li className="muted">없음</li>}
      </ul>

      <h3>찜 많은 상품 TOP 10 (사입·재입고 참고)</h3>
      <ul>
        {topWish.map((w) => (
          <li key={w.productId}>
            <Link href={`/admin/products/${w.productId}`}>{wishNames.get(w.productId) ?? `상품 #${w.productId}`}</Link> — ♥ {w._count._all}
          </li>
        ))}
        {topWish.length === 0 && <li className="muted">아직 찜이 없어요</li>}
      </ul>
    </>
  );
}
