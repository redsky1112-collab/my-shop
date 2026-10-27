import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import ProductForm from "../ProductForm";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const p = await prisma.product.findUnique({ where: { id: Number(id) } });
  if (!p) notFound();
  return (<><h1 className="page-title">상품 수정</h1><ProductForm p={p} /></>);
}
