import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { saveUploadedImage } from "@/lib/image";

// 브라우저에서 미리 줄여서(최대 1600px, WebP/JPEG) 보내므로 보통 100~400KB
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ message: "관리자 로그인이 필요해요." }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const dim = (k: string) => Math.min(10000, Math.max(0, Math.floor(Number(q.get(k)) || 0)));
  const r = await saveUploadedImage(req, dim("w"), dim("h"));
  if ("error" in r) return NextResponse.json({ message: r.error }, { status: r.status });
  return NextResponse.json({ url: r.url });
}
