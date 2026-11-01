import { FIRST_COUPON } from "@/lib/coupon";
import { won } from "@/lib/format";
import { QuoteMark } from "@/components/Logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { demoLoginVisible, getUser, providerEnabled, safeNext } from "@/lib/user";
import { demoLogin } from "./actions";

const ERRORS: Record<string, string> = {
  disabled: "아직 준비 중인 로그인 방식이에요.",
  canceled: "로그인을 취소했어요.",
  state: "로그인 시간이 지났거나 잘못된 요청이에요. 다시 시도해 주세요.",
  failed: "로그인에 실패했어요. 잠시 후 다시 시도해 주세요.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; why?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getUser()) redirect(next);

  const kakao = providerEnabled("kakao");
  const naver = providerEnabled("naver");
  const demo = await demoLoginVisible();
  const q = `?next=${encodeURIComponent(next)}`;

  return (
    <div className="login">
      <h1 className="page-title">로그인</h1>
      <p className="muted small">처음이면 약관 동의 한 번으로 바로 가입돼요. 별도 비밀번호가 필요 없어요.</p>
      <p className="welcome-coupon"><QuoteMark size={14} /> 가입하고 첫 주문하면 <b>{FIRST_COUPON.name}</b> (최대 {won(FIRST_COUPON.max)})</p>
      {sp.error && <p className="error">{ERRORS[sp.error] || ERRORS.failed}</p>}
      {sp.error && sp.why && <p className="small muted">오류 코드: {sp.why.slice(0, 120)}</p>}

      <div className="login-btns">
        {kakao ? (
          <a className="btn-social kakao" href={`/api/auth/kakao/start${q}`}>카카오로 시작하기</a>
        ) : (
          <span className="btn-social kakao off">카카오로 시작하기 (준비 중)</span>
        )}
        {naver ? (
          <a className="btn-social naver" href={`/api/auth/naver/start${q}`}>네이버로 시작하기</a>
        ) : (
          <span className="btn-social naver off">네이버로 시작하기 (준비 중)</span>
        )}
        {demo && (
          <form action={demoLogin}>
            <input type="hidden" name="next" value={next} />
            <button className="btn outline block">테스트 계정으로 로그인 (관리자 전용)</button>
          </form>
        )}
      </div>

      <p className="small muted" style={{ marginTop: 24 }}>
        회원가입 없이도 주문할 수 있어요. <Link href="/order/lookup" className="link">비회원 주문조회</Link>
      </p>
    </div>
  );
}
