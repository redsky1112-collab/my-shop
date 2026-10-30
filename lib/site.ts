// 전자상거래법상 쇼핑몰 하단에 표시해야 하는 사업자 정보. 실제 값으로 바꾸세요.
export const SITE = {
  name: "DUOLOGUE",
  company: "상호명",
  ceo: "대표자명",
  bizNo: "000-00-00000",
  mailOrderNo: "제0000-서울OO-0000호",
  address: "사업장 주소",
  phone: "000-0000-0000",
  email: "help@example.com",
  privacyOfficer: "개인정보보호책임자 이름",
  youthOfficer: "청소년보호책임자 이름",
};

// 브랜드 문구 (브랜드 가이드 V1.0)
export const BRAND = {
  tagline: "CONTEMPORARY LOOK FOR 3040",
  headline: "The Art of Fashion Duologue",
  lead: "나를 표현하고, 하루의 태도를 완성하는 듀오로그의 프리미엄 라인을 만나보세요.",
  slogan: "나만의 가치를 완성하는 옷과의 대화",
};

export const SHIPPING = {
  fee: 3000,
  freeOver: 50000,
};

export const ORDER_STATUS: Record<string, string> = {
  PENDING: "결제대기",
  PAID: "결제완료",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
  CANCELED: "취소",
};
