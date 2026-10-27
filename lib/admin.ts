import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signToken, verifyToken } from "./sign";

export const ADMIN_COOKIE = "admin_session";

export async function isAdmin() {
  const c = await cookies();
  return !!verifyToken<{ exp: number; admin: boolean }>(c.get(ADMIN_COOKIE)?.value)?.admin;
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export function makeAdminToken() {
  return signToken({ admin: true, exp: Date.now() + 1000 * 60 * 60 * 8 });
}
