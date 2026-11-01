"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ADMIN_COOKIE, makeAdminToken, requireAdmin } from "@/lib/admin";
import { cookieOpts } from "@/lib/adult";
import { safeEqual } from "@/lib/sign";
import { ORDER_STATUS } from "@/lib/site";
import { lineOf } from "@/lib/lines";
import { syncProductStock } from "@/lib/stock";
import { cancelPayment } from "@/lib/refund";
import { parseLines, reasonOf } from "@/lib/claims";
import { COURIERS } from "@/lib/couriers";
import { MAX_PRODUCT_IMAGES } from "@/lib/gallery";

export async function login(_: unknown, fd: FormData): Promise<{ error?: string } | null> {
  const pw = String(fd.get("password") || "");
  const real = process.env.ADMIN_PASSWORD || "";
  if (!real || !safeEqual(pw, real)) return { error: "비밀번호가 틀렸어요." };
  (await cookies()).set(ADMIN_COOKIE, makeAdminToken(), { ...cookieOpts, maxAge: 60 * 60 * 8 });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

type SaveResult = { error: string } | void;

/** 비어 있으면 자동 주소 생성 (p-xxxxxx) */
const slugOr = (v: FormDataEntryValue | null, prefix: string) => {
  const s = String(v || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return s || `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
};

/** DB 오류를 사람이 읽을 수 있는 문구로 */
function dbError(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code === "P2002") return "같은 주소용 영문 이름(slug)이 이미 있어요. 다른 이름을 쓰거나 비워 두세요.";
  if (code === "P2003") return "선택한 카테고리나 상품을 찾을 수 없어요. 새로고침 후 다시 시도해 주세요.";
  console.error("[admin save]", e);
  return "저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}

const int = (v: FormDataEntryValue | null) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : 0;
};

export async function saveProduct(fd: FormData): Promise<SaveResult> {
  await requireAdmin();
  const id = int(fd.get("id"));
  const categoryId = int(fd.get("categoryId"));
  const cat = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!cat) return { error: "카테고리를 선택해 주세요." };
  const sale = int(fd.get("salePrice"));
  // 상품 사진 여러 장: 사이트 내부 주소(/img/..) 또는 https 주소만, 중복 제거, 최대 10장. 첫 장이 대표 사진
  const images = [...new Set(fd.getAll("images").map((v) => String(v).trim()))]
    .filter((u) => /^\/(?!\/)\S+$/.test(u) || /^https:\/\/\S+$/i.test(u));
  if (images.length > MAX_PRODUCT_IMAGES) return { error: `상품 사진은 ${MAX_PRODUCT_IMAGES}장까지 올릴 수 있어요.` };
  const data = {
    name: String(fd.get("name") || "").trim(),
    slug: slugOr(fd.get("slug"), "p"),
    price: int(fd.get("price")),
    salePrice: sale > 0 ? sale : null,
    description: String(fd.get("description") || ""),
    imageUrl: images[0] ?? null,
    images,
    stock: int(fd.get("stock")),
    options: "",
    active: fd.get("active") === "on",
    // 성인 카테고리 상품은 무조건 성인 상품으로 처리
    adultOnly: cat.adultOnly || fd.get("adultOnly") === "on",
    categoryId,
    line: lineOf(String(fd.get("line") || "")) ? String(fd.get("line")) : "",
    gender: ["M", "F", "U"].includes(String(fd.get("gender"))) ? String(fd.get("gender")) : "U",
    styles: fd.getAll("styles").map(String).join(","),
    fit: String(fd.get("fit") || ""),
    colors: String(fd.get("colors") || "").split(",").map((s) => s.trim()).filter(Boolean).join(","),
    sizeChart: String(fd.get("sizeChart") || "").trim(),
  };
  // 옵션(사이즈)별 재고: opt_name / opt_stock 쌍 (같은 이름은 합침, 빈 이름 제외)
  const names = fd.getAll("opt_name").map((v) => String(v).trim());
  const stocks = fd.getAll("opt_stock").map((v) => Math.max(0, int(v)));
  const variantMap = new Map<string, number>();
  names.forEach((n, i) => { if (n) variantMap.set(n, (variantMap.get(n) ?? 0) + (stocks.at(i) ?? 0)); });
  const variants = [...variantMap.entries()].map(([option, stock], sort) => ({ option, stock, sort }));
  if (variants.length > 0) {
    data.options = variants.map((v) => v.option).join(",");
    data.stock = variants.reduce((a, v) => a + v.stock, 0);
  }
  if (variants.some((v) => v.option.includes(","))) return { error: "옵션 이름에는 쉼표(,)를 쓸 수 없어요." };
  if (!data.name) return { error: "상품명을 입력해 주세요." };
  if (data.price <= 0) return { error: "정가를 1원 이상으로 입력해 주세요." };
  if (data.salePrice && data.salePrice >= data.price) return { error: "할인가는 정가보다 낮아야 해요." };
  let savedId = id;
  try {
    await prisma.$transaction(async (tx) => {
      const saved = id ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data });
      savedId = saved.id;
      // 빠진 옵션 삭제 → 남은 옵션은 재고 갱신·새 옵션 추가
      await tx.variant.deleteMany({ where: { productId: saved.id, option: { notIn: variants.map((v) => v.option) } } });
      for (const v of variants) {
        await tx.variant.upsert({
          where: { productId_option: { productId: saved.id, option: v.option } },
          update: { stock: v.stock, sort: v.sort },
          create: { productId: saved.id, ...v },
        });
      }
      await syncProductStock(tx, saved.id);
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  revalidatePath("/", "layout");
  // 새 의류 상품은 저장 후 바로 AI 화보 화면으로 (PRIVATE 제외)
  if (!id && !data.adultOnly) redirect(`/admin/products/${savedId}/ai?new=1`);
  redirect("/admin/products");
}

export async function deactivateProduct(fd: FormData) {
  await requireAdmin();
  await prisma.product.update({ where: { id: int(fd.get("id")) }, data: { active: false } });
  revalidatePath("/admin/products");
}

export async function updateOrder(fd: FormData) {
  await requireAdmin();
  const status = String(fd.get("status"));
  if (!ORDER_STATUS[status]) return;
  const id = int(fd.get("id"));
  const cur = await prisma.order.findUnique({ where: { id }, select: { status: true } });
  if (!cur) return;
  // 취소는 반드시 환불 화면에서 (결제된 주문을 상태만 '취소'로 바꾸면 돈이 환불되지 않음)
  let nextStatus = cur.status === "CANCELED" ? "CANCELED" : status === "CANCELED" && cur.status !== "PENDING" ? cur.status : status;
  const trackingNo = String(fd.get("trackingNo") || "").replace(/\s|-/g, "").slice(0, 30);
  const courier = String(fd.get("courier") || "");
  // 결제완료 주문에 송장을 넣으면 자동으로 배송중
  if (trackingNo && nextStatus === "PAID") nextStatus = "SHIPPING";
  await prisma.order.update({
    where: { id },
    data: {
      status: nextStatus,
      trackingNo: trackingNo || null,
      ...(COURIERS.some((c) => c.key === courier) ? { courier } : {}),
      ...(nextStatus === "DELIVERED" && cur.status !== "DELIVERED" ? { deliveredAt: new Date() } : {}),
    },
  });
  revalidatePath("/admin/orders");
}

export async function refundOrder(fd: FormData): Promise<SaveResult> {
  await requireAdmin();
  const orderId = int(fd.get("orderId"));
  const mode = String(fd.get("mode")); // full / partial
  const lines = mode === "partial"
    ? fd.getAll("itemId").map((v, i) => ({ itemId: int(v), qty: int(fd.getAll("qty").at(i) ?? null) }))
    : undefined;
  const r = await cancelPayment({
    orderId,
    lines,
    refundShipping: fd.get("refundShipping") === "on",
    restock: fd.get("restock") === "on",
    deduct: int(fd.get("deduct")),
    reason: String(fd.get("reason") || ""),
    by: "admin",
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/", "layout");
  redirect(`/admin/orders/${orderId}?done=${r.amount}`);
}

export async function addCategory(fd: FormData) {
  await requireAdmin();
  const name = String(fd.get("name") || "").trim();
  const slug = String(fd.get("slug") || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (!name || !slug) return;
  try {
    await prisma.category.create({
      data: { name, slug, adultOnly: fd.get("adultOnly") === "on", sort: int(fd.get("sort")) },
    });
  } catch (e) {
    console.error("[addCategory]", e); // slug 중복 등: 화면이 멈추지 않게 무시
  }
  revalidatePath("/", "layout");
}

export async function updateCategory(fd: FormData) {
  await requireAdmin();
  const name = String(fd.get("name") || "").trim();
  if (!name) return;
  await prisma.category.update({
    where: { id: int(fd.get("id")) },
    data: { name, menuName: String(fd.get("menuName") || "").trim(), sort: int(fd.get("sort")) },
  });
  revalidatePath("/", "layout");
}

export async function saveBanner(fd: FormData): Promise<SaveResult> {
  await requireAdmin();
  const id = int(fd.get("id"));
  const link = String(fd.get("link") || "").trim();
  const data = {
    imageUrl: String(fd.get("imageUrl") || "").trim(),
    tagline: String(fd.get("tagline") || "").trim().slice(0, 60),
    title: String(fd.get("title") || "").trim().slice(0, 60),
    sub: String(fd.get("sub") || "").trim().slice(0, 100),
    // 우리 사이트 안 주소만 허용
    link: link.startsWith("/") && !link.startsWith("//") ? link : "",
    full: fd.get("full") === "on",
    sort: int(fd.get("sort")),
    active: fd.get("active") === "on",
  };
  if (!data.imageUrl) return { error: "배너 사진을 올려 주세요." };
  try {
    if (id) await prisma.banner.update({ where: { id }, data });
    else {
      if ((await prisma.banner.count({ where: { active: true } })) >= 3 && data.active) {
        return { error: "노출 중인 배너는 최대 3개예요. 기존 배너를 숨기거나 지운 뒤 추가해 주세요." };
      }
      await prisma.banner.create({ data });
    }
  } catch (e) {
    return { error: dbError(e) };
  }
  revalidatePath("/", "layout");
  redirect("/admin/banners");
}

export async function deleteBanner(fd: FormData) {
  await requireAdmin();
  await prisma.banner.deleteMany({ where: { id: int(fd.get("id")) } });
  revalidatePath("/", "layout");
}

export async function saveLook(fd: FormData): Promise<SaveResult> {
  await requireAdmin();
  const id = int(fd.get("id"));
  const productIds = [...new Set(fd.getAll("productIds").map((v) => int(v)).filter((n) => n > 0))];
  const data = {
    title: String(fd.get("title") || "").trim(),
    slug: slugOr(fd.get("slug"), "look"),
    description: String(fd.get("description") || ""),
    imageUrl: String(fd.get("imageUrl") || "").trim() || null,
    line: lineOf(String(fd.get("line") || "")) ? String(fd.get("line")) : "",
    gender: ["M", "F", "U"].includes(String(fd.get("gender"))) ? String(fd.get("gender")) : "U",
    styles: fd.getAll("styles").map(String).join(","),
    active: fd.get("active") === "on",
    sort: int(fd.get("sort")),
  };
  if (!data.title) return { error: "코디명을 입력해 주세요." };
  if (productIds.length < 2) return { error: "상품을 2개 이상 골라 주세요." };
  const items = { create: productIds.map((productId, i) => ({ productId, sort: i })) };
  try {
    if (id) {
      await prisma.$transaction([
        prisma.lookItem.deleteMany({ where: { lookId: id } }),
        prisma.look.update({ where: { id }, data: { ...data, items } }),
      ]);
    } else {
      await prisma.look.create({ data: { ...data, items } });
    }
  } catch (e) {
    return { error: dbError(e) };
  }
  revalidatePath("/", "layout");
  redirect("/admin/looks");
}

// ── 교환·반품 처리 ──
const CLAIM_NEXT = ["REQUESTED", "APPROVED", "COLLECTING", "REJECTED"];

export async function updateClaim(fd: FormData): Promise<SaveResult> {
  await requireAdmin();
  const id = int(fd.get("id"));
  const c = await prisma.claim.findUnique({ where: { id } });
  if (!c) return { error: "신청을 찾을 수 없어요." };
  if (c.status === "COMPLETED") return { error: "이미 완료된 신청이에요." };
  const status = String(fd.get("status"));
  if (!CLAIM_NEXT.includes(status)) return { error: "완료 처리는 아래 환불·교환 발송 버튼으로 해 주세요." };
  const adminMemo = String(fd.get("adminMemo") || "").trim().slice(0, 500);
  if (status === "REJECTED" && !adminMemo) return { error: "거절할 때는 고객에게 보일 안내 문구를 적어 주세요." };
  await prisma.claim.update({
    where: { id },
    data: { status, adminMemo, returnTrackingNo: String(fd.get("returnTrackingNo") || "").trim().slice(0, 40) },
  });
  revalidatePath("/", "layout");
  redirect(`/admin/claims/${id}?saved=1`);
}

/** 반품 완료: 신청 상품만큼 결제 취소(환불) → 신청 완료 */
export async function refundClaim(fd: FormData): Promise<SaveResult> {
  await requireAdmin();
  const id = int(fd.get("id"));
  const c = await prisma.claim.findUnique({ where: { id } });
  if (!c || c.type !== "RETURN") return { error: "반품 신청이 아니에요." };
  if (c.status === "COMPLETED" || c.status === "REJECTED") return { error: "이미 처리된 신청이에요." };
  const lines = parseLines(c.items).map((l) => ({ itemId: l.itemId, qty: l.qty }));
  const r = await cancelPayment({
    orderId: c.orderId,
    lines,
    refundShipping: c.sellerFault && fd.get("refundShipping") === "on",
    restock: fd.get("restock") === "on",
    deduct: int(fd.get("deduct")),
    reason: `반품: ${reasonOf(c.reason)?.label ?? c.reason}`,
    by: "admin",
  });
  if (!r.ok) return { error: r.error };
  await prisma.claim.update({
    where: { id },
    data: { status: "COMPLETED", adminMemo: String(fd.get("adminMemo") || "").trim() || `${r.amount.toLocaleString("ko-KR")}원 환불 완료` },
  });
  revalidatePath("/", "layout");
  redirect(`/admin/claims/${id}?saved=1`);
}

/** 교환 완료: 새 사이즈 재고 차감(+회수 상품 재고 복구 선택) → 발송 송장 기록 → 신청 완료 */
export async function completeExchange(fd: FormData): Promise<SaveResult> {
  await requireAdmin();
  const id = int(fd.get("id"));
  const c = await prisma.claim.findUnique({ where: { id }, include: { order: { include: { items: true } } } });
  if (!c || c.type !== "EXCHANGE") return { error: "교환 신청이 아니에요." };
  if (c.status === "COMPLETED" || c.status === "REJECTED") return { error: "이미 처리된 신청이에요." };
  const resend = String(fd.get("resendTrackingNo") || "").trim().slice(0, 40);
  if (!resend) return { error: "교환 상품 발송 송장번호를 적어 주세요." };
  const restock = fd.get("restock") === "on";
  const byId = new Map(c.order.items.map((i) => [i.id, i]));
  try {
    await prisma.$transaction(async (tx) => {
      for (const l of parseLines(c.items)) {
        const it = byId.get(l.itemId);
        if (!it) continue;
        const to = l.toOption || it.option;
        const hasVariants = (await tx.variant.count({ where: { productId: it.productId } })) > 0;
        if (hasVariants) {
          const v = await tx.variant.updateMany({
            where: { productId: it.productId, option: to, stock: { gte: l.qty } },
            data: { stock: { decrement: l.qty } },
          });
          if (v.count === 0) throw new Error(`${it.name} (${to}) 재고가 부족해요.`);
          if (restock) {
            await tx.variant.updateMany({ where: { productId: it.productId, option: it.option }, data: { stock: { increment: l.qty } } });
          }
          await syncProductStock(tx, it.productId);
        } else if (!restock) {
          const r = await tx.product.updateMany({ where: { id: it.productId, stock: { gte: l.qty } }, data: { stock: { decrement: l.qty } } });
          if (r.count === 0) throw new Error(`${it.name} 재고가 부족해요.`);
        }
      }
      await tx.claim.update({
        where: { id },
        data: { status: "COMPLETED", resendTrackingNo: resend, adminMemo: String(fd.get("adminMemo") || "").trim() || "교환 상품을 보내 드렸어요." },
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "교환 처리 중 문제가 생겼어요." };
  }
  revalidatePath("/", "layout");
  redirect(`/admin/claims/${id}?saved=1`);
}

// 리뷰 숨김/다시 보이기 (부적절한 글 관리). 지우지 않고 숨기는 걸 기본으로
export async function toggleReview(fd: FormData) {
  await requireAdmin();
  const r = await prisma.review.findUnique({ where: { id: int(fd.get("id")) }, include: { product: { select: { slug: true } } } });
  if (!r) return;
  await prisma.review.update({ where: { id: r.id }, data: { hidden: !r.hidden } });
  revalidatePath(`/product/${r.product.slug}`);
  revalidatePath("/admin/reviews");
}

// 재입고 알림: 한 상품·옵션의 대기 신청을 '보냄'으로 처리 (문자 발송 후 누름)
export async function markRestockSent(fd: FormData) {
  await requireAdmin();
  await prisma.restockAlert.updateMany({
    where: { productId: int(fd.get("productId")), option: String(fd.get("option") ?? ""), notifiedAt: null },
    data: { notifiedAt: new Date() },
  });
  revalidatePath("/admin/restock");
}
