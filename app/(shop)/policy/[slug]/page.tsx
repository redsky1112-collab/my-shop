import { notFound } from "next/navigation";
import { SITE } from "@/lib/site";

// ⚠️ 아래는 뼈대 예시예요. 오픈 전 공정위 표준약관·개인정보보호위원회 작성지침을 참고해 실제 내용으로 교체하세요.
const DOCS: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "이용약관",
    body: [
      `제1조(목적) 이 약관은 ${SITE.company}(이하 "회사")가 운영하는 ${SITE.name}에서 제공하는 서비스의 이용조건 및 절차에 관한 사항을 규정합니다.`,
      "제2조(청약철회) 이용자는 상품을 공급받은 날부터 7일 이내에 청약철회를 할 수 있습니다. 단, 위생용품 등 포장을 훼손하여 재판매가 곤란한 경우 등 관계법령이 정한 경우는 제외됩니다.",
      "※ 공정거래위원회 「전자상거래 표준약관」을 기준으로 작성하세요.",
    ],
  },
  privacy: {
    title: "개인정보처리방침",
    body: [
      "1. 수집 항목: 이름, 휴대폰번호, 이메일, 배송지 주소, 결제기록, 본인인증 결과(성인 여부)",
      "2. 이용 목적: 회원 식별(카카오·네이버 로그인), 주문·배송·고객상담, 맞춤 추천(스타일 진단), 청소년 유해매체물 이용 제한을 위한 연령 확인. [선택] 마케팅 수신에 동의한 경우 쿠폰·신상품 안내(마이페이지에서 언제든 철회)",
      "3. 보유 기간: 전자상거래법에 따라 계약·청약철회·대금결제 기록 5년, 소비자 불만·분쟁처리 기록 3년",
      "4. 처리 위탁: 결제(토스페이먼츠), 본인인증(포트원 및 인증기관), 배송(택배사)",
      `5. 개인정보보호책임자: ${SITE.privacyOfficer} (${SITE.email})`,
    ],
  },
  youth: {
    title: "청소년보호정책",
    body: [
      "회사는 청소년이 유해정보에 접근하지 않도록 성인 전용 카테고리(PRIVATE DIALOGUE) 및 상품에 대해 본인인증(성인인증)을 거친 이용자만 열람·구매할 수 있도록 하고 있습니다.",
      "인증 전에는 해당 상품의 이름·이미지를 노출하지 않으며, 결제창과 영수증에도 상품명을 표시하지 않습니다.",
      `청소년보호책임자: ${SITE.youthOfficer} (${SITE.email})`,
    ],
  },
};

export default async function Policy({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = DOCS[slug];
  if (!d) notFound();
  return (
    <article className="policy">
      <h1 className="page-title">{d.title}</h1>
      {d.body.map((p, i) => <p key={i}>{p}</p>)}
    </article>
  );
}
