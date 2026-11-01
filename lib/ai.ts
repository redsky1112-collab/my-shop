// AI(FASHN) 공용 설정 — 브라우저에서도 사용 (DB·키 접근 없음)

/** 고객 가상 피팅: 회원 1인당 하루 횟수 */
export const FITTING_DAILY = 3;

/** 관리자 AI 화보 배경 프리셋 (FASHN에 보내는 영어 프롬프트) */
export const PHOTO_PRESETS = [
  { key: "studio", label: "스튜디오 (밝은 베이지 배경)", prompt: "full body fashion catalog photo, clean warm beige studio background, soft natural light, contemporary minimal styling" },
  { key: "green", label: "브랜드 컬러 (딥 그린 배경)", prompt: "editorial fashion photo, deep bottle green studio backdrop, soft directional light, refined contemporary mood" },
  { key: "city", label: "도심 거리", prompt: "fashion editorial photo on a calm Seoul city street, daytime, natural light, modern architecture, relaxed confident pose" },
  { key: "office", label: "오피스·라운지", prompt: "fashion photo in a modern minimal office lounge, warm daylight, wood and stone textures, professional relaxed pose" },
  { key: "cafe", label: "카페·주말", prompt: "lifestyle fashion photo in a bright minimal cafe, weekend mood, natural window light, candid relaxed pose" },
] as const;

export const MODEL_LOOKS = [
  { key: "M", label: "남성 모델 (30대 한국인)", prompt: "Korean man in his 30s" },
  { key: "F", label: "여성 모델 (30대 한국인)", prompt: "Korean woman in her 30s" },
] as const;

/** 화보 1장 예상 크레딧 (FASHN product-to-model 요금표) */
export function photoCredits(resolution: "1k" | "2k", face: boolean) {
  return (resolution === "2k" ? 3 : 1) + (face ? 3 : 0); // 1k=fast(1), 2k=balanced(3), 얼굴 고정 +3
}

/** 1크레딧 대략 원화 (FASHN 사전 충전 $0.075 기준, 환율 변동 있음) */
export const WON_PER_CREDIT = 105;
