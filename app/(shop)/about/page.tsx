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
