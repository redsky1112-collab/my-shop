import { prisma } from "@/lib/db";

// 업로드 이미지 제공. 한 번 올린 이미지는 내용이 바뀌지 않으므로 브라우저·CDN에 오래 캐시
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{20,40}$/i.test(id)) return new Response("Not found", { status: 404 });
  const img = await prisma.image.findUnique({ where: { id }, select: { mime: true, data: true } });
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
