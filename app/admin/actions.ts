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
  const data = {
    name: String(fd.get("name") || "").trim(),
    slug: slugOr(fd.get("slug"), "p"),
    price: int(fd.get("price")),
    salePrice: sale > 0 ? sale : null,
    description: String(fd.get("description") || ""),
    imageUrl: String(fd.get("imageUrl") || "").trim() || null,
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
  try {
    await prisma.$transaction(async (tx) => {
      const saved = id ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data });
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
  await prisma.order.update({
    where: { id: int(fd.get("id")) },
    data: { status, trackingNo: String(fd.get("trackingNo") || "").trim() || null },
  });
  revalidatePath("/admin/orders");
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
