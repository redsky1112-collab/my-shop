"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/user";
import { BODY_TYPES } from "@/lib/style";
import { REVIEW_MAX, REVIEW_MIN, REVIEW_PHOTOS, SIZE_FEELS, maskName, reviewable } from "@/lib/reviews";

const num = (v: FormDataEntryValue | null, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : 0;
};

/** 구매 후기 저장 — 본인·배송완료·1상품 1리뷰를 서버에서 다시 확인 */
export async function submitReview(fd: FormData): Promise<{ error: string } | void> {
  const user = await getUser();
  if (!user) return { error: "로그인이 필요해요." };
  const itemId = Math.floor(Number(fd.get("itemId")) || 0);
  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: true, product: { select: { slug: true } }, review: { select: { id: true } } },
  });
  if (!item || item.order.userId !== user.id) return { error: "본인이 주문한 상품만 리뷰를 쓸 수 있어요." };
  if (!reviewable(item.order, item)) return { error: "배송완료된 상품만 리뷰를 쓸 수 있어요." };
  if (item.review) return { error: "이미 리뷰를 쓴 상품이에요." };

  const rating = num(fd.get("rating"), 1, 5);
  if (!rating) return { error: "별점을 골라 주세요." };
  const sizeFeel = String(fd.get("sizeFeel") || "");
  if (!SIZE_FEELS.some((s) => s.key === sizeFeel)) return { error: "사이즈가 어땠는지 골라 주세요." };
  const content = String(fd.get("content") || "").trim();
  if (content.length < REVIEW_MIN) return { error: `후기를 ${REVIEW_MIN}자 이상 적어 주세요.` };
  const gender = ["M", "F"].includes(String(fd.get("gender"))) ? String(fd.get("gender")) : "";
  const bodyType = BODY_TYPES.some((b) => b.key === fd.get("bodyType")) ? String(fd.get("bodyType")) : "";
  const photos = [...new Set(String(fd.get("photos") || "").split(",").filter((u) => /^\/img\/[a-z0-9]+$/i.test(u)))].slice(0, REVIEW_PHOTOS);

  try {
    await prisma.review.create({
      data: {
        productId: item.productId, orderItemId: item.id, userId: user.id, authorName: maskName(user.name),
        rating, sizeFeel, content: content.slice(0, REVIEW_MAX), option: item.option, photos,
        gender, height: num(fd.get("height"), 120, 220), weight: num(fd.get("weight"), 30, 200), bodyType,
      },
    });
  } catch {
    return { error: "이미 리뷰를 썼거나 저장에 실패했어요. 다시 확인해 주세요." };
  }
  revalidatePath(`/product/${item.product.slug}`);
  redirect("/mypage?reviewed=1");
}
