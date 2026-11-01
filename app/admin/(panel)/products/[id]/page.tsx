import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import ProductForm from "../ProductForm";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const p = await prisma.product.findUnique({ where: { id: Number(id) }, include: { variants: true, category: true } });
  if (!p) notFound();
  return (
    <>
      <h1 className="page-title">상품 수정</h1>
      {!(p.adultOnly || p.category.adultOnly) && (
        <Link href={`/admin/products/${p.id}/ai`} className="ai-entry">
          <b>✨ AI 화보 · 가상 피팅</b>
          <span>옷 사진으로 모델 착용컷 만들기 · 가상 피팅용 사진 지정 →</span>
        </Link>
      )}
      <ProductForm p={p} />
    </>
  );
}
