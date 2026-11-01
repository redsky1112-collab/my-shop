import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { refreshJob } from "@/lib/fashn";

/** 관리자: AI 작업 상태 (화면에서 몇 초마다 확인) */
export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ message: "관리자 로그인이 필요해요." }, { status: 401 });
  const id = Math.floor(Number(new URL(req.url).searchParams.get("id"))) || 0;
  const job = await refreshJob(id);
  if (!job) return NextResponse.json({ message: "작업을 찾을 수 없어요." }, { status: 404 });
  return NextResponse.json({ status: job.status, outputs: job.outputs, error: job.error }, { headers: { "Cache-Control": "no-store" } });
}
