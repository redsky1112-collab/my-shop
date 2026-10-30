import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

// 브라우저에서 미리 줄여서(최대 1600px, WebP/JPEG) 보내므로 보통 100~400KB.
// Vercel 함수 요청 한도(4.5MB)보다 넉넉히 작게 제한
const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED = ["image/webp", "image/jpeg", "image/png", "image/gif"];

// 파일 앞부분(매직 넘버)으로 실제 이미지인지 확인 — 확장자/헤더만 믿지 않음
function sniff(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ message: "관리자 로그인이 필요해요." }, { status: 401 });

  let file: File | null = null;
  try {
    const fd = await req.formData();
    const f = fd.get("file");
    if (f instanceof File) file = f;
  } catch {
    /* fallthrough */
  }
  if (!file || file.size === 0) return NextResponse.json({ message: "이미지 파일이 없어요." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ message: "이미지가 너무 커요 (3MB 이하)." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniff(bytes);
  if (!mime || !ALLOWED.includes(mime)) {
    return NextResponse.json({ message: "JPG, PNG, WebP, GIF 이미지만 올릴 수 있어요." }, { status: 415 });
  }

  // 가로·세로 크기(브라우저가 줄인 값, 참고용)
  const q = new URL(req.url).searchParams;
  const dim = (k: string) => Math.min(10000, Math.max(0, Math.floor(Number(q.get(k)) || 0)));

  const img = await prisma.image.create({
    data: { mime, data: bytes, size: bytes.length, width: dim("w"), height: dim("h") },
    select: { id: true },
  });
  return NextResponse.json({ url: `/img/${img.id}` });
}
