"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ADMIN_COOKIE, makeAdminToken, requireAdmin } from "@/lib/admin";
import { cookieOpts } from "@/lib/adult";
import { safeEqual } from "@/lib/sign";
import { ORDER_STATUS } from "@/lib/site";

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

const int = (v: FormDataEntryValue | null) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : 0;
};

export async function saveProduct(fd: FormData) {
  await requireAdmin();
  const id = int(fd.get("id"));
  const categoryId = int(fd.get("categoryId"));
  const cat = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!cat) throw new Error("카테고리를 선택하세요.");
  const sale = int(fd.get("salePrice"));
  const data = {
    name: String(fd.get("name") || "").trim(),
    slug: String(fd.get("slug") || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    price: int(fd.get("price")),
    salePrice: sale > 0 ? sale : null,
    description: String(fd.get("description") || ""),
    imageUrl: String(fd.get("imageUrl") || "").trim() || null,
    stock: int(fd.get("stock")),
    options: String(fd.get("options") || "").split(",").map((s) => s.trim()).filter(Boolean).join(","),
    active: fd.get("active") === "on",
    // 성인 카테고리 상품은 무조건 성인 상품으로 처리
    adultOnly: cat.adultOnly || fd.get("adultOnly") === "on",
    categoryId,
  };
  if (!data.name || !data.slug || data.price <= 0) throw new Error("상품명, 주소(slug), 가격은 필수예요.");
  if (id) await prisma.product.update({ where: { id }, data });
  else await prisma.product.create({ data });
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
  if (!ORDER_STATUS[status]) throw new Error("잘못된 상태");
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
  if (!name || !slug) throw new Error("이름과 slug는 필수예요.");
  await prisma.category.create({
    data: { name, slug, adultOnly: fd.get("adultOnly") === "on", sort: int(fd.get("sort")) },
  });
  revalidatePath("/", "layout");
}
