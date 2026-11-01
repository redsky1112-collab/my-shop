import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/user";
import { refreshJob } from "@/lib/fashn";

/** 본인 가상 피팅 결과 확인 */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요해요." }, { status: 401 });
  const id = Math.floor(Number(new URL(req.url).searchParams.get("id"))) || 0;
  const own = await prisma.aiJob.findFirst({ where: { id, kind: "fitting", userId: user.id }, select: { id: true } });
  if (!own) return NextResponse.json({ message: "피팅 기록을 찾을 수 없어요." }, { status: 404 });
  const job = await refreshJob(id);
  return NextResponse.json(
    { status: job?.status, output: job?.outputs?.[0] ?? "", error: job?.status === "failed" ? "이번 사진으로는 피팅 이미지를 만들지 못했어요. 다른 사진으로 해 보세요. (횟수는 차감되지 않아요)" : "" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
