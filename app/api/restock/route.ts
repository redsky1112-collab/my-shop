import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/user";
import { isAdultVerified } from "@/lib/adult";
import { onlyDigits } from "@/lib/format";
import { availableFor } from "@/lib/stock";
import { RESTOCK_PER_PHONE } from "@/lib/restock";

const bad = (message: string, status = 400) => NextResponse.json({ message }, { status });

/** 재입고 알림 신청: 품절된 옵션만, 휴대폰 번호 + 수신 동의 필수 (비회원도 가능) */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const productId = Math.floor(Number(b.productId)) || 0;
  const option = typeof b.option === "string" ? b.option.trim().slice(0, 50) : "";
  const phone = onlyDigits(String(b.phone || ""));
  if (b.agree !== true) return bad("알림 수신에 동의해 주세요.");
  if (!/^01\d{8,9}$/.test(phone)) return bad("휴대폰 번호를 확인해 주세요.");

  const p = await prisma.product.findUnique({ where: { id: productId }, include: { variants: true, category: true } });
  if (!p || !p.active) return bad("판매 중인 상품이 아니에요.", 404);
  if ((p.adultOnly || p.category.adultOnly) && !(await isAdultVerified())) return bad("성인인증이 필요해요.", 403);
  const opts = p.options.split(",").map((s) => s.trim()).filter(Boolean);
  if (opts.length ? !opts.includes(option) : option !== "") return bad("옵션을 확인해 주세요.");
  if (availableFor(p, option) > 0) return bad("지금 바로 구매할 수 있어요!");

  const pending = await prisma.restockAlert.count({ where: { phone, notifiedAt: null } });
  if (pending >= RESTOCK_PER_PHONE) return bad(`한 번호로 ${RESTOCK_PER_PHONE}개까지 신청할 수 있어요.`);

  const user = await getUser();
  // 예전에 알림 받고 끝난 신청이면 다시 대기로 (같은 번호·옵션은 1건만)
  await prisma.restockAlert.upsert({
    where: { productId_option_phone: { productId, option, phone } },
    update: { notifiedAt: null, createdAt: new Date(), ...(user ? { userId: user.id } : {}) },
    create: { productId, option, phone, userId: user?.id ?? null },
  });
  return NextResponse.json({ ok: true });
}
