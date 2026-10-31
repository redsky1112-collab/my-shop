import { Suspense } from "react";
import { redirect } from "next/navigation";
import { adultMode, isAdultVerified } from "@/lib/adult";
import AdultVerify from "./AdultVerify";

const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const to = safeNext(next);
  if (await isAdultVerified()) redirect(to);
  return (
    <div className="adult-gate private">
      <div className="r19 big">19</div>
      <h1>성인인증이 필요해요</h1>
      <p className="muted">
        이 정보내용은 청소년유해매체물로서 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 및
        「청소년 보호법」에 따라 19세 미만의 청소년이 이용할 수 없습니다.
      </p>
      <Suspense>
      <AdultVerify
        mode={adultMode()}
        next={to}
        storeId={process.env.NEXT_PUBLIC_PORTONE_STORE_ID || ""}
        channelKey={process.env.NEXT_PUBLIC_PORTONE_IDV_CHANNEL_KEY || ""}
      />
      </Suspense>
      <a className="link" href="/">19세 미만 나가기</a>
    </div>
  );
}
