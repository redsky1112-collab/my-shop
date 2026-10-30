import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import BannerForm from "../BannerForm";

export default async function EditBanner({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const b = await prisma.banner.findUnique({ where: { id: Number(id) } });
  if (!b) notFound();
  return (<><h1 className="page-title">배너 수정</h1><BannerForm b={b} /></>);
}
