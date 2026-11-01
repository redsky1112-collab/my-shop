import { NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { saveUploadedImage } from "@/lib/image";

// 리뷰 사진: 로그인한 회원만 (브라우저에서 미리 줄여서 보냄)
export async function POST(req: Request) {
  if (!(await getUser())) return NextResponse.json({ message: "로그인이 필요해요." }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const dim = (k: string) => Math.min(10000, Math.max(0, Math.floor(Number(q.get(k)) || 0)));
  const r = await saveUploadedImage(req, dim("w"), dim("h"));
  if ("error" in r) return NextResponse.json({ message: r.error }, { status: r.status });
  return NextResponse.json({ url: r.url });
}
