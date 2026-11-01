"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/user";

/** 회원 본인의 재입고 알림 신청 취소 */
export async function cancelRestock(fd: FormData) {
  const user = await getUser();
  if (!user) return;
  await prisma.restockAlert.deleteMany({ where: { id: Math.floor(Number(fd.get("id"))) || 0, userId: user.id } });
  revalidatePath("/mypage");
}
