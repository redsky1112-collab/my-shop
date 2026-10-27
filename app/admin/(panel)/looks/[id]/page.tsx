import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import LookForm from "../LookForm";

export default async function EditLook({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const l = await prisma.look.findUnique({ where: { id: Number(id) }, include: { items: true } });
  if (!l) notFound();
  return (<><h1 className="page-title">코디 수정</h1><LookForm l={l} /></>);
}
