import Link from "next/link";
import Logo from "@/components/Logo";
import { BRAND } from "@/lib/site";

export const metadata = { title: "ABOUT" };

export default function About() {
  return (
    <div className="about">
      <section className="about-hero">
        <Logo stacked light />
      </section>

      <blockquote className="about-quote">
        옷은 단순히 입는 소비재가 아닙니다.
        <br />
        당당하게 오늘을 살아가는 나와 의상 간의 가장 친밀한 대화(Duologue)입니다.
      </blockquote>

      <h2 className="about-h">WHO WE ARE</h2>
      <p className="about-lead">
        DUOLOGUE는 단순히 의류를 판매하는 쇼핑몰이 아닙니다.
        <br />
        고객의 <b>취향</b>과 <b>체형</b>, <b>라이프스타일</b>을 이해하고, 자신에게 어울리는 스타일을
        스스로 선택할 수 있도록 돕는 <b>AI 기반 프리미엄 패션 셀렉트숍</b>입니다.
      </p>
      <div className="about-pillars">
        <div><b>취향</b><span>1분 스타일 진단으로 좋아하는 무드와 핏을 파악해요</span></div>
        <div><b>체형</b><span>키·몸무게·체형으로 맞는 사이즈를 추천해요</span></div>
        <div><b>라이프스타일</b><span>출근·주말·특별한 날, 상황에 맞는 코디를 제안해요</span></div>
      </div>
      <div className="row center"><Link href="/style-quiz" className="btn outline">1분 스타일 진단 해보기</Link></div>

      <h2 className="about-h">CORE PHILOSOPHY</h2>
      <div className="about-cards">
        <div className="about-card">
          <span className="about-no">01</span>
          <h3>나를 대변하는 주체성</h3>
          <p>일, 사회, 일상의 수많은 역할 속에서도 중심을 잃지 않는 3040 세대를 유연한 실루엣과 정교한 테일러링으로 당당하게 지지합니다.</p>
        </div>
        <div className="about-card">
          <span className="about-no">02</span>
          <h3>도시적이고 지적인 균형감</h3>
          <p>과도한 디테일이나 찰나의 트렌드에 휘둘리지 않고, 입었을 때 품격과 아우라가 은은하게 피어나는 미니멀리스틱 클래식을 추구합니다.</p>
        </div>
      </div>

      <p className="about-slogan">{BRAND.slogan}</p>
      <div className="row center"><Link href="/" className="btn">컬렉션 보기</Link></div>
    </div>
  );
}
