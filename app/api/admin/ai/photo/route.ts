import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { fashnRun, getSetting, toFashnImage } from "@/lib/fashn";
import { MODEL_LOOKS, PHOTO_PRESETS, photoCredits } from "@/lib/ai";
import { galleryOf } from "@/lib/gallery";

const bad = (message: string, status = 400) => NextResponse.json({ message }, { status });

/** 관리자 AI 화보: 상품(옷) 사진 → AI 모델 착용컷 (FASHN product-to-model) */
export async function POST(req: Request) {
  if (!(await isAdmin())) return bad("관리자 로그인이 필요해요.", 401);
  const b = await req.json().catch(() => ({}));
  const p = await prisma.product.findUnique({ where: { id: Math.floor(Number(b.productId)) || 0 }, include: { category: true } });
  if (!p) return bad("상품을 찾을 수 없어요.", 404);
  if (p.adultOnly || p.category.adultOnly) return bad("PRIVATE 상품은 AI 화보를 만들 수 없어요.");

  const source = String(b.source || "");
  if (!galleryOf(p).includes(source)) return bad("상품 사진 중에서 골라 주세요.");
  const product_image = await toFashnImage(source);
  if (!product_image) return bad("사진을 불러오지 못했어요.");

  const preset = PHOTO_PRESETS.find((x) => x.key === b.preset) ?? PHOTO_PRESETS[0];
  const look = MODEL_LOOKS.find((x) => x.key === b.look) ?? MODEL_LOOKS[p.gender === "F" ? 1 : 0];
  const extra = String(b.extra || "").trim().slice(0, 200);
  const resolution = b.resolution === "2k" ? "2k" : "1k";
  const num = Math.min(4, Math.max(1, Math.floor(Number(b.num)) || 1));

  let face_reference: string | null = null;
  if (b.useFace) {
    const ref = await getSetting("ai_face_ref");
    face_reference = ref ? await toFashnImage(ref) : null;
    if (!face_reference) return bad("브랜드 모델 얼굴 사진을 먼저 등록해 주세요.");
  }

  const inputs: Record<string, unknown> = {
    product_image,
    prompt: [look.prompt, preset.prompt, extra].filter(Boolean).join(", "),
    aspect_ratio: "3:4",
    resolution,
    generation_mode: resolution === "2k" ? "balanced" : "fast",
    num_images: num,
    output_format: "jpeg",
  };
  if (face_reference) inputs.face_reference = face_reference;

  const r = await fashnRun("product-to-model", inputs);
  if ("error" in r) return bad(r.error, 502);
  const job = await prisma.aiJob.create({
    data: { kind: "photo", productId: p.id, predictionId: r.id, credits: photoCredits(resolution, !!face_reference) * num },
  });
  return NextResponse.json({ jobId: job.id });
}
