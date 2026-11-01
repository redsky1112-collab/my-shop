import { prisma } from "./db";

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED = ["image/webp", "image/jpeg", "image/png", "image/gif"];

// 파일 앞부분(매직 넘버)으로 실제 이미지인지 확인 — 확장자/헤더만 믿지 않음
export function sniff(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

/** 폼데이터의 file 을 검사해 저장하고 /img/{id} 주소 반환 */
export async function saveUploadedImage(req: Request, w = 0, h = 0): Promise<{ url: string } | { error: string; status: number }> {
  let file: File | null = null;
  try {
    const f = (await req.formData()).get("file");
    if (f instanceof File) file = f;
  } catch {
    /* fallthrough */
  }
  if (!file || file.size === 0) return { error: "이미지 파일이 없어요.", status: 400 };
  if (file.size > MAX_IMAGE_BYTES) return { error: "이미지가 너무 커요 (3MB 이하).", status: 413 };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniff(bytes);
  if (!mime || !ALLOWED.includes(mime)) return { error: "JPG, PNG, WebP, GIF 이미지만 올릴 수 있어요.", status: 415 };
  const img = await prisma.image.create({ data: { mime, data: bytes, size: bytes.length, width: w, height: h }, select: { id: true } });
  return { url: `/img/${img.id}` };
}
