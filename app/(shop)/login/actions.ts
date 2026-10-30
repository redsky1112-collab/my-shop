"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { cookieOpts } from "@/lib/adult";
import { USER_COOKIE, USER_TTL_MS, afterLoginPath, demoLoginEnabled, getUser, makeUserToken, safeNext, upsertSocialUser } from "@/lib/user";

export async function logout() {
  (await cookies()).delete(USER_COOKIE);
  revalidatePath("/", "layout");
  redirect("/");
}

/** 시연용 테스트 로그인: 브라우저마다 새 테스트 계정을 만들어 서로 주문이 섞이지 않음 */
export async function demoLogin(fd: FormData) {
  if (!demoLoginEnabled()) redirect("/login?error=disabled");
  const n = crypto.randomInt(1000, 9999);
  const user = await upsertSocialUser("demo", crypto.randomUUID(), { name: `테스트회원${n}` });
  (await cookies()).set(USER_COOKIE, makeUserToken(user.id), { ...cookieOpts, maxAge: USER_TTL_MS / 1000 });
  revalidatePath("/", "layout");
  redirect(afterLoginPath(user, safeNext(fd.get("next"))));
}

/** 회원 탈퇴: 회원 정보 삭제, 주문 기록은 법정 보관을 위해 연결만 끊고 남김 */
export async function withdraw() {
  const user = await getUser();
  if (user) await prisma.user.delete({ where: { id: user.id } });
  (await cookies()).delete(USER_COOKIE);
  revalidatePath("/", "layout");
  redirect("/?bye=1");
}
