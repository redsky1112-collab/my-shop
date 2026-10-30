/**
 * DUOLOGUE 상품 라인 구성 (목표 비중)
 * key는 DB에 저장되는 값이라 바꾸지 말고, 이름·설명·비중만 고치세요.
 */
export const LINES = [
  {
    key: "formal",
    name: "FORMAL ESSENTIAL",
    ko: "포멀 에센셜",
    desc: "중요한 자리를 위한 테일러드 재킷과 포멀 셋업",
    items: "테일러드 재킷 · 포멀 셋업",
    target: 30,
  },
  {
    key: "smart",
    name: "SMART CASUAL",
    ko: "스마트 캐주얼",
    desc: "출근부터 저녁 약속까지, 단정하지만 편안하게",
    items: "슬랙스 · 고밀도 셔츠 · 디자이너 니트 · 트렌치코트",
    target: 50,
  },
  {
    key: "lounge",
    name: "LOUNGE & DAILY",
    ko: "라운지 & 데일리",
    desc: "소재가 주는 여유, 감각적인 일상복",
    items: "원피스 · 조거 슬랙스 · 감각적인 아우터",
    target: 20,
  },
] as const;

export type LineKey = (typeof LINES)[number]["key"];
export const lineOf = (key: string) => LINES.find((l) => l.key === key);
