import { prisma } from "./db";

// FASHN API 연동 (서버 전용). 키는 Vercel 환경변수 FASHN_API_KEY
// 문서: https://docs.fashn.ai — POST /v1/run → { id }, GET /v1/status/{id} → { status, output[], error }
const BASE = "https://api.fashn.ai/v1";

export const fashnEnabled = () => !!process.env.FASHN_API_KEY;

const headers = () => ({
  Authorization: `Bearer ${process.env.FASHN_API_KEY || ""}`,
  "Content-Type": "application/json",
});

export type FashnStatus = { status: "processing" | "completed" | "failed"; output: string[]; error: string };

/** 작업 시작 → prediction id */
export async function fashnRun(modelName: string, inputs: Record<string, unknown>): Promise<{ id: string } | { error: string }> {
  if (!fashnEnabled()) return { error: "AI 기능이 아직 연결되지 않았어요 (FASHN_API_KEY 미등록)." };
  try {
    const res = await fetch(`${BASE}/run`, {
      method: "POST", headers: headers(), cache: "no-store",
      body: JSON.stringify({ model_name: modelName, inputs }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) {
      const msg = data?.error?.message || data?.message || data?.error || `HTTP ${res.status}`;
      if (res.status === 401) return { error: "FASHN API 키가 올바르지 않아요." };
      if (res.status === 402 || /credit/i.test(String(msg))) return { error: "FASHN 크레딧이 부족해요. 충전 후 다시 시도해 주세요." };
      if (res.status === 429) return { error: "요청이 많아요. 잠시 후 다시 시도해 주세요." };
      return { error: `AI 요청 실패: ${typeof msg === "string" ? msg : "알 수 없는 오류"}` };
    }
    return { id: String(data.id) };
  } catch {
    return { error: "AI 서버와 통신하지 못했어요." };
  }
}

/** 작업 상태 조회 */
export async function fashnStatus(id: string): Promise<FashnStatus> {
  try {
    const res = await fetch(`${BASE}/status/${encodeURIComponent(id)}`, { headers: headers(), cache: "no-store" });
    const d = await res.json().catch(() => ({}));
    if (d.status === "completed") return { status: "completed", output: Array.isArray(d.output) ? d.output.map(String) : [], error: "" };
    if (d.status === "failed") return { status: "failed", output: [], error: d?.error?.message || "이미지 생성에 실패했어요." };
    return { status: "processing", output: [], error: "" };
  } catch {
    return { status: "processing", output: [], error: "" };
  }
}

/** AiJob 상태를 FASHN에서 받아와 갱신 (완료·실패면 그대로 반환) */
export async function refreshJob(jobId: number) {
  const job = await prisma.aiJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "processing") return job;
  const s = await fashnStatus(job.predictionId);
  if (s.status === "processing") {
    // 10분 넘게 안 끝나면 실패 처리 (횟수 돌려줌)
    if (Date.now() - job.createdAt.getTime() > 10 * 60 * 1000) {
      return prisma.aiJob.update({ where: { id: job.id }, data: { status: "failed", error: "시간이 너무 오래 걸려 중단했어요." } });
    }
    return job;
  }
  return prisma.aiJob.update({ where: { id: job.id }, data: { status: s.status, outputs: s.output, error: s.error } });
}

/** 우리 사이트 이미지(/img/{id})는 data URI로, 외부 https 주소는 그대로 (성인·비공개 이미지 주소가 밖에 안 나가게) */
export async function toFashnImage(url: string): Promise<string | null> {
  const m = url.match(/^\/img\/([a-z0-9]+)$/i);
  if (m) {
    const img = await prisma.image.findUnique({ where: { id: m[1] }, select: { mime: true, data: true } });
    if (!img) return null;
    return `data:${img.mime};base64,${Buffer.from(img.data).toString("base64")}`;
  }
  return /^https:\/\/\S+$/i.test(url) ? url : null;
}

/** FASHN 결과 주소만 허용 (다운로드해서 우리 DB에 저장할 때) */
export const isFashnOutput = (url: string) => /^https:\/\/(cdn|media)\.fashn\.ai\//i.test(url);

/** 결과 이미지를 받아 우리 Image 테이블에 저장 → /img/{id} */
export async function saveFashnOutput(url: string): Promise<{ url: string } | { error: string }> {
  if (!isFashnOutput(url)) return { error: "FASHN 결과 이미지만 저장할 수 있어요." };
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { error: "결과 이미지를 받지 못했어요 (3일이 지나면 만료돼요)." };
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > 15 * 1024 * 1024) return { error: "이미지가 너무 커요." };
    const mime = res.headers.get("content-type")?.split(";")[0] || "image/png";
    if (!/^image\/(png|jpeg|webp)$/.test(mime)) return { error: "이미지 형식이 올바르지 않아요." };
    const img = await prisma.image.create({ data: { mime, data: bytes, size: bytes.length }, select: { id: true } });
    return { url: `/img/${img.id}` };
  } catch {
    return { error: "결과 이미지를 저장하지 못했어요." };
  }
}

export async function getSetting(key: string) {
  return (await prisma.setting.findUnique({ where: { key } }))?.value ?? "";
}
export async function setSetting(key: string, value: string) {
  await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}
