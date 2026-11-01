import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { availableFor } from "@/lib/stock";
import { restockMessage } from "@/lib/restock";
import { markRestockSent } from "../../actions";

type Group = {
  productId: number; option: string; name: string; slug: string; adult: boolean; stock: number;
  phones: string[]; since: Date;
};

export default async function AdminRestock() {
  await requireAdmin();
  const host = (await headers()).get("host") || "duologue.co.kr";
  const alerts = await prisma.restockAlert.findMany({
    where: { notifiedAt: null },
    orderBy: { createdAt: "asc" },
    include: { product: { include: { variants: true, category: { select: { adultOnly: true } } } } },
    take: 3000,
  });

  const map = new Map<string, Group>();
  for (const a of alerts) {
    const key = `${a.productId}|${a.option}`;
    const g = map.get(key) ?? {
      productId: a.productId, option: a.option, name: a.product.name, slug: a.product.slug,
      adult: a.product.adultOnly || a.product.category.adultOnly,
      stock: a.product.active ? availableFor(a.product, a.option) : 0, phones: [], since: a.createdAt,
    };
    g.phones.push(a.phone);
    map.set(key, g);
  }
  const groups = [...map.values()];
  const ready = groups.filter((g) => g.stock > 0);
  const waiting = groups.filter((g) => g.stock <= 0).sort((a, b) => b.phones.length - a.phones.length);

  return (
    <>
      <h1 className="page-title">재입고 알림</h1>
      <p className="small muted">
        재고를 다시 채우면(상품 수정 › 사이즈별 재고) 아래 &lsquo;알림 보낼 차례&rsquo;로 올라와요. 문자·알림톡을 보낸 뒤 &lsquo;보냄 처리&rsquo;를 눌러 주세요.
        (문자 발송 서비스를 연결하면 자동 발송으로 바꿀 수 있어요)
      </p>

      <h3>알림 보낼 차례 ({ready.length})</h3>
      {ready.length === 0 ? <p className="muted">없음</p> : (
        <div className="restock-groups">
          {ready.map((g) => (
            <div key={`${g.productId}|${g.option}`} className="restock-group ready">
              <div className="row between">
                <Link href={`/admin/products/${g.productId}`}><b>{g.name}</b>{g.option && ` · ${g.option}`}</Link>
                <span className="small">재고 {g.stock} · 신청 {g.phones.length}명</span>
              </div>
              <label className="small">보낼 문구
                <textarea readOnly rows={2} value={restockMessage({ name: g.name, option: g.option, adult: g.adult, url: `https://${host}/product/${g.slug}` })} />
              </label>
              <label className="small">받는 번호 ({g.phones.length})
                <textarea readOnly rows={Math.min(4, g.phones.length)} value={g.phones.join(", ")} />
              </label>
              {g.phones.length > g.stock && <p className="small out" style={{ margin: 0 }}>신청자가 재고보다 많아요. 먼저 신청한 순서대로 적혀 있어요.</p>}
              <form action={markRestockSent}>
                <input type="hidden" name="productId" value={g.productId} />
                <input type="hidden" name="option" value={g.option} />
                <button className="btn small">보냄 처리</button>
              </form>
            </div>
          ))}
        </div>
      )}

      <h3>품절 대기 수요 (재입고 우선순위 참고)</h3>
      {waiting.length === 0 ? <p className="muted">없음</p> : (
        <table className="table">
          <thead><tr><th>상품</th><th>옵션</th><th>신청</th><th>첫 신청</th></tr></thead>
          <tbody>
            {waiting.map((g) => (
              <tr key={`${g.productId}|${g.option}`}>
                <td><Link href={`/admin/products/${g.productId}`}>{g.name}</Link></td>
                <td>{g.option || "-"}</td>
                <td><b>{g.phones.length}</b>명</td>
                <td className="small muted">{g.since.toLocaleDateString("ko-KR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
