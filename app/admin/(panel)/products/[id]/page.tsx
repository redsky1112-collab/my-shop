import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import ProductForm from "../ProductForm";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const p = await prisma.product.findUnique({ where: { id: Number(id) }, include: { variants: true } });
  if (!p) notFound();
  return (
    <>
      <div className="row between">
        <h1 className="page-title">상품 수정</h1>
        <Link href={`/admin/products/${p.id}/ai`} className="btn small outline">✨ AI 화보 · 가상 피팅</Link>
      </div>
      <ProductForm p={p} />
    </>
  );
}
