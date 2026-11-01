import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/user";
import { fashnEnabled, fashnRun, toFashnImage } from "@/lib/fashn";
import { sniff } from "@/lib/image";
import { galleryOf } from "@/lib/gallery";
import { FITTING_DAILY, FITTING_GLOBAL_DAILY_DEFAULT } from "@/lib/ai";
import { isAdmin } from "@/lib/admin";

const bad = (message: string, status = 400) => NextResponse.json({ message }, { status });
const noStore = { "Cache-Control": "no-store" };

/** 한국 시간 오늘 0시 */
function todayKst() {
  const now = Date.now() + 9 * 3600 * 1000;
  return new Date(Math.floor(now / 86400000) * 86400000 - 9 * 3600 * 1000);
}

const globalLimit = () => Number(process.env.FITTING_GLOBAL_DAILY) || FITTING_GLOBAL_DAILY_DEFAULT;

/** 쓸 수 없는 이유 (없으면 빈 문자열): 테스트 계정은 관리자 브라우저에서만, 사이트 전체 하루 한도 */
async function blockedReason(user: { provider: string }) {
  if (user.provider === "demo" && !(await isAdmin())) {
    return "테스트 계정은 가상 피팅을 쓸 수 없어요. 카카오·네이버로 로그인해 주세요.";
  }
  const all = await prisma.aiJob.count({ where: { kind: "fitting", createdAt: { gte: todayKst() }, status: { not: "failed" } } });
  if (all >= globalLimit()) return "오늘 준비된 가상 피팅이 모두 마감됐어요. 내일 다시 이용해 주세요.";
  return "";
}

async function usedToday(userId: number) {
  return prisma.aiJob.count({ where: { kind: "fitting", userId, createdAt: { gte: todayKst() }, status: { not: "failed" } } });
}

/** 피팅 가능 여부·남은 횟수 */
export async function GET() {
  const user = await getUser();
  if (!fashnEnabled()) return NextResponse.json({ enabled: false }, { headers: noStore });
  if (!user) return NextResponse.json({ enabled: true, member: false, left: 0 }, { headers: noStore });
  const blocked = await blockedReason(user);
  return NextResponse.json(
    { enabled: true, member: true, blocked, left: blocked ? 0 : Math.max(0, FITTING_DAILY - (await usedToday(user.id))) },
    { headers: noStore },
  );
}

/** 가상 피팅 요청: { productId, photo: data URI } — 고객 사진은 저장하지 않고 FASHN 요청에만 사용 */
export async function POST(req: Request) {
  if (!fashnEnabled()) return bad("가상 피팅은 준비 중이에요.", 503);
  const user = await getUser();
  if (!user) return bad("로그인 후 이용할 수 있어요.", 401);
  const b = await req.json().catch(() => ({}));
  const blocked = await blockedReason(user);
  if (blocked) return bad(blocked, 403);
  if (b.agree !== true) return bad("사진 이용에 동의해 주세요.");

  // 사진 확인: data URI, 실제 이미지인지(매직 넘버), 4MB 이하
  const m = String(b.photo || "").match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return bad("사진을 다시 골라 주세요.");
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > 4 * 1024 * 1024) return bad("사진이 너무 커요.");
  if (!sniff(new Uint8Array(bytes))) return bad("JPG·PNG·WebP 사진만 쓸 수 있어요.");

  const p = await prisma.product.findUnique({ where: { id: Math.floor(Number(b.productId)) || 0 }, include: { category: true } });
  if (!p || !p.active) return bad("판매 중인 상품이 아니에요.", 404);
  if (p.adultOnly || p.category.adultOnly) return bad("이 상품은 가상 피팅을 지원하지 않아요.");
  const gallery = galleryOf(p);
  const garmentUrl = p.garmentImage && gallery.includes(p.garmentImage) ? p.garmentImage : gallery[0];
  const product_image = garmentUrl ? await toFashnImage(garmentUrl) : null;
  if (!product_image) return bad("이 상품은 아직 가상 피팅용 사진이 없어요.");

  // 하루 횟수·동시 진행 제한
  if ((await usedToday(user.id)) >= FITTING_DAILY) return bad(`가상 피팅은 하루 ${FITTING_DAILY}번까지예요. 내일 다시 이용해 주세요.`, 429);
  const running = await prisma.aiJob.count({
    where: { kind: "fitting", userId: user.id, status: "processing", createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
  });
  if (running > 0) return bad("이전 피팅을 만드는 중이에요. 잠시만 기다려 주세요.", 429);

  const r = await fashnRun("tryon-max", {
    product_image,
    model_image: `data:image/${m[1]};base64,${m[2]}`,
    resolution: "1k",
    generation_mode: "fast", // 1크레딧, 약 10초
    output_format: "jpeg",
  });
  if ("error" in r) {
    console.error("[fitting]", r.error);
    return bad("지금은 가상 피팅을 할 수 없어요. 잠시 후 다시 시도해 주세요.", 502);
  }
  const job = await prisma.aiJob.create({ data: { kind: "fitting", userId: user.id, productId: p.id, predictionId: r.id, credits: 1 } });
  return NextResponse.json({ jobId: job.id });
}
