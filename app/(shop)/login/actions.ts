"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { cookieOpts } from "@/lib/adult";
import {
  JOIN_COOKIE, USER_COOKIE, USER_TTL_MS, afterLoginPath, demoLoginVisible, getJoinPending, getUser, makeUserToken, safeNext, upsertSocialUser,
} from "@/lib/user";

export async function logout() {
  (await cookies()).delete(USER_COOKIE);
  revalidatePath("/", "layout");
  redirect("/");
}

/** 시연용 테스트 로그인: 브라우저마다 새 테스트 계정을 만들어 서로 주문이 섞이지 않음 */
export async function demoLogin(fd: FormData) {
  if (!(await demoLoginVisible())) redirect("/login?error=disabled");
  const n = crypto.randomInt(1000, 9999);
  const user = await upsertSocialUser("demo", crypto.randomUUID(), { name: `테스트회원${n}` }, { marketing: false });
  (await cookies()).set(USER_COOKIE, makeUserToken(user.id), { ...cookieOpts, maxAge: USER_TTL_MS / 1000 });
  revalidatePath("/", "layout");
  redirect(afterLoginPath(user, safeNext(fd.get("next"))));
}

/** 가입 동의 완료 → 이때 처음으로 회원 정보 저장 */
export async function joinAgree(_: unknown, fd: FormData): Promise<{ error?: string } | null> {
  const pending = await getJoinPending();
  if (!pending) return { error: "가입 시간이 지났어요. 다시 로그인해 주세요." };
  if (!fd.get("age") || !fd.get("terms") || !fd.get("privacy")) return { error: "필수 항목에 모두 동의해 주세요." };
  const user = await upsertSocialUser(pending.provider, pending.providerId, pending, { marketing: !!fd.get("marketing") });
  const c = await cookies();
  c.delete(JOIN_COOKIE);
  c.set(USER_COOKIE, makeUserToken(user.id), { ...cookieOpts, maxAge: USER_TTL_MS / 1000 });
  revalidatePath("/", "layout");
  redirect(afterLoginPath(user, safeNext(pending.next)));
}

export async function joinCancel() {
  (await cookies()).delete(JOIN_COOKIE);
  redirect("/");
}

/** 마이페이지: 쿠폰·신상품 소식 수신 동의 변경 */
export async function setMarketing(fd: FormData) {
  const user = await getUser();
  if (!user) redirect("/login?next=/mypage");
  const on = fd.get("on") === "1";
  await prisma.user.update({ where: { id: user.id }, data: { marketingAgree: on, marketingAgreedAt: on ? new Date() : null } });
  revalidatePath("/mypage");
}

/** 회원 탈퇴: 회원 정보 삭제, 주문 기록은 법정 보관을 위해 연결만 끊고 남김 */
export async function withdraw() {
  const user = await getUser();
  if (user) {
    // 회원이 신청한 재입고 알림(휴대폰 번호)도 같이 삭제
    await prisma.restockAlert.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  (await cookies()).delete(USER_COOKIE);
  revalidatePath("/", "layout");
  redirect("/?bye=1");
}
