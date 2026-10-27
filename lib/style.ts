/**
 * 스타일 맞춤 설정 — 타깃(성별·연령대)이 정해지면 여기만 고치면 돼요.
 * key는 DB에 저장되는 값이라 한번 쓰기 시작하면 바꾸지 말고, label만 바꾸세요.
 */
export const GENDERS = [
  { key: "M", label: "남성" },
  { key: "F", label: "여성" },
  { key: "U", label: "상관없음" },
] as const;

export const STYLES = [
  { key: "minimal", label: "미니멀", desc: "군더더기 없는 무채색 위주" },
  { key: "dandy", label: "댄디", desc: "셔츠·슬랙스, 깔끔한 출근룩" },
  { key: "casual", label: "캐주얼", desc: "편하고 활동적인 데일리" },
  { key: "street", label: "스트릿", desc: "오버핏·그래픽·트렌디" },
  { key: "classic", label: "클래식", desc: "코트·니트, 차분하고 고급스러운" },
] as const;

export const FITS = [
  { key: "slim", label: "슬림핏", desc: "몸에 붙는" },
  { key: "regular", label: "레귤러핏", desc: "적당히 여유" },
  { key: "over", label: "오버핏", desc: "넉넉하고 루즈한" },
] as const;

export const BODY_TYPES = [
  { key: "slim", label: "마른 편" },
  { key: "normal", label: "보통" },
  { key: "muscular", label: "근육형·어깨 넓음" },
  { key: "chubby", label: "통통·배 나온 편" },
] as const;

export const TOP_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
export const WAISTS = [26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 38];

export const BUDGETS = [
  { key: 50000, label: "5만원 이하" },
  { key: 100000, label: "10만원 이하" },
  { key: 200000, label: "20만원 이하" },
  { key: 0, label: "상관없음" },
] as const;

export const labelOf = (list: readonly { key: string | number; label: string }[], key: string | number) =>
  list.find((x) => x.key === key)?.label ?? String(key);

export const splitTags = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export type StyleProfile = {
  gender: string; // M/F/U
  height: number;
  weight: number;
  bodyType: string;
  topSize: string;
  waist: number;
  styles: string[];
  fit: string;
  budget: number; // 0 = 무관
  savedAt: number;
};
