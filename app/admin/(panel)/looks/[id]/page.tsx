import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import ActionForm from "@/components/ActionForm";
import { deleteLook, setLookActive } from "../../../actions";
import LookForm from "../LookForm";

export default async function EditLook({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const l = await prisma.look.findUnique({ where: { id: Number(id) }, include: { items: true } });
  if (!l) notFound();
  return (
    <>
      <h1 className="page-title">코디 수정</h1>
      <LookForm l={l} />

      <div className="danger-zone">
        <h3>노출 상태 · 삭제</h3>
        <div className="row between">
          <span>지금: <b>{l.active ? "노출" : "숨김"}</b></span>
          <form action={setLookActive}>
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="on" value={l.active ? "0" : "1"} />
            <button className="btn small outline">{l.active ? "숨기기" : "다시 노출"}</button>
          </form>
        </div>
        <ActionForm action={deleteLook} className="danger-form">
          <input type="hidden" name="id" value={l.id} />
          <label className="check"><input type="checkbox" name="confirm" value="1" /> 삭제할게요 (코디 묶음만 삭제 · 상품은 그대로)</label>
          <button className="btn small danger">코디 삭제</button>
        </ActionForm>
        <p><Link href="/admin/looks" className="link small">← 코디 목록</Link></p>
      </div>
    </>
  );
}
