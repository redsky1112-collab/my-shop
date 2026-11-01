import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { fashnEnabled, getSetting } from "@/lib/fashn";
import { galleryOf } from "@/lib/gallery";
import AiStudio from "./AiStudio";

export default async function ProductAi({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const isNew = (await searchParams).new === "1";
  const p = await prisma.product.findUnique({ where: { id: Number(id) || 0 }, include: { category: true } });
  if (!p) notFound();
  const adult = p.adultOnly || p.category.adultOnly;
  const since = new Date(Date.now() - 3 * 24 * 3600 * 1000); // FASHN 결과 주소는 3일간 유효
  const [jobs, faceRef] = await Promise.all([
    prisma.aiJob.findMany({ where: { kind: "photo", productId: p.id, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 10 }),
    getSetting("ai_face_ref"),
  ]);

  return (
    <>
      <Link href={`/admin/products/${p.id}`} className="link">← 상품 수정으로</Link>
      {isNew && (
        <div className="form-ok ai-new">
          <b>상품을 등록했어요 ✓</b> 이어서 AI 착용 화보를 만들어 보세요. 지금 안 해도 돼요.
          <Link href="/admin/products" className="link">나중에 할게요 → 상품 목록</Link>
        </div>
      )}
      <h1 className="page-title">AI 화보 · 가상 피팅 설정</h1>
      <p className="muted" style={{ marginTop: -8 }}>{p.name}</p>
      {adult ? (
        <p className="form-error">PRIVATE 상품은 AI 화보·가상 피팅을 쓰지 않아요.</p>
      ) : (
        <AiStudio
          enabled={fashnEnabled()}
          productId={p.id}
          gender={p.gender}
          images={galleryOf(p)}
          garmentImage={p.garmentImage}
          faceRef={faceRef}
          recent={jobs.map((j) => ({ id: j.id, status: j.status, outputs: j.outputs, error: j.error, at: j.createdAt.toLocaleString("ko-KR") }))}
        />
      )}
    </>
  );
}
