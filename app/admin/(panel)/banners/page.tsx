import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { deleteBanner } from "../../actions";

export default async function Banners() {
  await requireAdmin();
  const list = await prisma.banner.findMany({ orderBy: [{ sort: "asc" }, { id: "asc" }] });
  return (
    <>
      <div className="row between">
        <h1 className="page-title">메인 배너</h1>
        <Link href="/admin/banners/new" className="btn small">+ 배너 추가</Link>
      </div>
      <p className="small muted">첫 화면 맨 위 사진 슬라이드예요. 노출은 최대 3개, 순서 숫자가 작은 것부터 나와요. 배너가 없으면 기본 초록 배너가 나와요.</p>
      <div className="banner-admin">
        {list.map((b) => (
          <div key={b.id} className={`banner-row${b.active ? "" : " off"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.imageUrl} alt="" />
            <div className="grow">
              <b>{b.title || "(제목 없음)"}</b>
              <span className="small muted">{b.sub}</span>
              <span className="small muted">순서 {b.sort} · {b.active ? "노출 중" : "숨김"}{b.link ? ` · ${b.link}` : ""}</span>
            </div>
            <div className="right">
              <Link href={`/admin/banners/${b.id}`} className="btn small outline">수정</Link>
              <form action={deleteBanner}><input type="hidden" name="id" value={b.id} /><button className="link">삭제</button></form>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="muted">아직 배너가 없어요. 모델 사진으로 첫 배너를 만들어 보세요.</p>}
      </div>
    </>
  );
}
