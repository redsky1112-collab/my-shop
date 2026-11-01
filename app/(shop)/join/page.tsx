import { redirect } from "next/navigation";
import { QuoteMark } from "@/components/Logo";
import { getJoinPending, getUser } from "@/lib/user";
import JoinForm from "./JoinForm";

const LABEL: Record<string, string> = { kakao: "카카오", naver: "네이버" };

export const metadata = { title: "회원가입" };

/** 소셜 인증 후 처음 오신 분: 약관 동의 → 가입 완료 → 스타일 진단 */
export default async function JoinPage() {
  if (await getUser()) redirect("/mypage");
  const p = await getJoinPending();
  if (!p) redirect("/login");

  return (
    <div className="login">
      <h1 className="page-title">회원가입</h1>
      <p className="muted small">
        <QuoteMark size={12} /> {LABEL[p.provider] || p.provider} 계정{p.name ? ` (${p.name}님)` : ""}으로 가입해요.
        <br />아래 약관에 동의하시면 바로 가입이 끝나요.
      </p>
      <JoinForm />
    </div>
  );
}
