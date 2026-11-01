# DUOLOGUE 쇼핑몰 — 작업 인수인계 메모

새 대화에서 이 저장소를 이어 작업할 때 먼저 읽는 문서예요.

## 프로젝트
- 브랜드: DUOLOGUE (3040 컨템포러리 의류 + 성인 전용 라인 PRIVATE DIALOGUE)
- 스택: Next.js 15 (App Router) + Prisma 6 + Neon Postgres, Vercel 배포 (main 푸시 = 운영 배포)
- 테스트 사이트: https://my-shop-sigma-livid.vercel.app · 정식 도메인 duologue.co.kr 가비아에서 구매 완료(2026-11-01), Vercel 연결(A @ / CNAME www) 진행 중
  연결 후: 카카오·네이버 개발자센터에 새 도메인·콜백 URL 추가 필요 (코드는 origin 자동이라 수정 불필요)
- 대표님은 주로 휴대폰으로 작업. 설명은 결론 먼저, 짧고 친근하게, 비교는 표로.

## 반드시 유지할 것
1. 로그인 → (진단 안 한 회원) 6단계 스타일 진단 → 결과를 회원(User.styleProfile)에 저장 → 첫 화면·의류 카테고리·상품 상세(추천 사이즈)에 맞춤 추천
2. 첫 화면 = 브랜드 배너(모델 사진 슬라이드) + 맞춤 추천 + 신상품
3. 라인 구성(FORMAL 30 / SMART 50 / LOUNGE 20)은 첫 화면이 아닌 의류 카테고리 안에서 탭·묶음으로
4. PRIVATE에는 19 표시 항상 노출, 버건디 톤, 인증 전 상품명·사진 숨김
5. 결제된 주문은 상태만 '취소'로 바꾸지 않음 → 반드시 환불 흐름(lib/refund.ts)

## 작업 방식 (이 환경)
- 작업 공간에서 npm 레지스트리가 막혀 로컬 빌드 불가 → 코드를 꼼꼼히 검토 후 푸시하고,
  `gh api repos/redsky1112-collab/my-shop/commits/<sha>/statuses` 로 Vercel 빌드 성공을 확인
- 빌드 순서(vercel-build): prisma generate → prisma db push → tsx prisma/seed.ts → next build
  (스키마 추가는 db push로 자동 반영, 기존 데이터 변환은 seed.ts의 1회성 함수로)
- 관리자 저장 액션은 throw 대신 `{ error }` 반환 + `components/ActionForm` 사용 (운영에서 오류 화면 방지)

## 완료된 기능 (2026-11-01 기준)
| 영역 | 내용 | 주요 파일 |
|---|---|---|
| 브랜드 | 로고(심볼: 각진 머리+꼬리 닫는 따옴표 ”, 2026-11-01 확정 · Logo.tsx QUOTE_GLYPH·app/icon.svg)·컬러·ABOUT·모델 배너 슬라이드(관리자 > 메인 배너) | components/Logo, HeroSlider |
| 회원 | 카카오·네이버 로그인, 마이페이지, 테스트 로그인(AUTH_DEMO_ALLOW_PROD) | lib/user.ts |
| 맞춤 추천 | 6단계 진단, 취향·사이즈 추천, 코디 | lib/recommend.ts, style-quiz |
| 라인 | 상품 라인 지정, 카테고리 라인 탭, 대시보드 목표 비중 | lib/lines.ts |
| 재고 | 사이즈별 재고(Variant), 품절·잔여 표시 | lib/stock.ts |
| 결제 | 토스 결제위젯(테스트 키), 옵션 재고 선차감 | api/pay/confirm |
| 취소·환불 | 관리자 전체/부분 취소, 배송비 환불·차감, 고객 배송 전 취소 | lib/refund.ts, admin/orders/[id] |
| 교환·반품 | 고객 신청(기한 7/90일, 사진), 관리자 승인·회수·환불/교환 발송 | lib/claims.ts, admin/claims |
| 배송 | 택배사 선택, 송장 입력 시 자동 배송중, 배송조회 링크 | lib/couriers.ts |
| 선물 포장 | 주문서 선택 +2,000원, 메시지 카드 | (다른 세션에서 반영) |
| 상품 사진 | 여러 장(최대 10, 첫 장=대표 imageUrl 자동), 상세 스와이프 갤러리·크게 보기 | lib/gallery.ts, MultiImageUpload, product/[slug]/Gallery |
| 메인 배너 | 커플 모델 완성 이미지(닫는 따옴표 ” 버전, seed 1회 등록), 배너 '완성 이미지' 모드(full: 안 자름·문구 없음) | prisma/assets, seedMainBanner |
| 리뷰 | 배송완료 회원 상품 1건당 1개, 별점·사이즈 체감·사진 3장·작성 시점 체형 저장, 상세 "나와 비슷한 체형"(±5cm·±5kg·성별) 필터, 관리자 숨김 | lib/reviews.ts, review/[itemId], product/[slug]/Reviews, admin/reviews |
| 찜 | 상품 카드·상세 하트, /wishlist, 헤더 ♡ 개수. 비회원=브라우저, 로그인 시 회원(Wish)으로 합침. 대시보드 찜 TOP 10 | components/WishProvider·WishButton, api/wishlist |
| 첫 구매 쿠폰 | 회원·구매이력(PAID~DELIVERED) 없음·상품 3만원↑ → 10%(최대 1만원) 주문서 자동 적용. Order.discount, 결제 승인 때 중복 사용 차단, 부분환불은 할인액 비율 차감(itemsRefund) | lib/coupon.ts, api/orders, lib/refund.ts |
| 재입고 알림 | 품절 사이즈에 휴대폰+수신동의로 신청(비회원 가능), 관리자 '재입고 알림'에 입고된 건 문구·번호 정리 → 수동 발송 후 '보냄 처리'. 마이페이지 신청 목록, 대시보드 대상 수 | lib/restock.ts, api/restock, components/RestockForm, admin/restock |
| AI (FASHN) | 키만 넣으면 작동: Vercel 환경변수 FASHN_API_KEY (없으면 고객 버튼 숨김·관리자 안내). 관리자 상품 수정 › 'AI 화보·가상 피팅'(product-to-model: 옷 사진→AI 모델 착용컷, 배경 프리셋·브랜드 얼굴 고정, 마음에 드는 결과만 상품 사진으로 복사 저장 / 피팅용 옷 사진 지정). 고객 상세 '✨ AI 가상 피팅'(tryon-max fast 1k=1크레딧, 회원·하루 3회·실패는 미차감, 고객 사진 DB 미저장, 테스트(demo) 계정은 관리자 로그인 브라우저에서만, 사이트 전체 하루 100회 한도=FITTING_GLOBAL_DAILY). AiJob 기록, 대시보드 이번 달 크레딧 | lib/fashn.ts, lib/ai.ts, api/admin/ai/*, api/fitting, components/VirtualFitting, admin/products/[id]/ai |
| 관리자 | 상품(사진 업로드·사이즈 재고), 코디, 카테고리, 주문, 교환·반품, 배너 | app/admin |

## 다음 할 일
- 확인 필요: 택배사 조회 링크가 실제로 열리는지 (lib/couriers.ts 주소)
- 2단계(매출): ~~상품 사진 여러 장~~(완료), ~~체형 리뷰~~(완료), ~~찜~~(완료), ~~첫 구매 쿠폰~~(완료), ~~재입고 알림~~(완료 · 문자 자동 발송은 솔라피 등 API 키 연결 시)
- 카카오 알림톡 자동 발송 (재입고 알림 → 이후 주문완료·배송시작): 순서 고정
  1) 사업자등록 → 2) 도메인 duologue.co.kr 연결 확정(구매 완료) (템플릿 버튼 링크에 들어가므로 먼저) →
  3) 카카오톡 채널 'DUOLOGUE' 개설·비즈니스 인증 → 솔라피 가입·채널 연동 → 템플릿 등록·검수(2~3일) →
  4) 대표님께 받을 값: 솔라피 API Key·Secret, pfId, 템플릿 ID, (문자 대체용) 발신번호 → 재고 입고 시 자동 발송 연결,
     RestockForm 동의 문구를 '카카오 알림톡(실패 시 문자)'로 변경. 그 전까지는 관리자 > 재입고 알림에서 수동 발송
- 3단계(AI) — 순서 변경(2026-11-01): 사업자·도메인 없이 개인 계정 API 키로 먼저 진행 가능
  1) 사입 전후 API 키 발급 → 2) 같은 가상 피팅 API로 '관리자 AI 화보'+'고객 가상 피팅' 함께 개발 →
  3) 오픈 홍보 = "가상 피팅 + 첫 구매 10%" → 4) AI 상담 챗봇은 그다음
  가상 피팅 조건: 회원 전용·하루 3회 제한, "AI 예시, 실제 핏과 다를 수 있음" 안내, 사진 업로드 동의 + 생성 후 원본 자동 삭제,
  PRIVATE 제외, 상품은 옷만 찍힌 정면 사진 필요(사입 시 도매처 사진 확보).
  → FASHN으로 결정·개발 완료(2026-11-01). 남은 것: 대표님 FASHN 가입·크레딧 충전·키 등록 후 실사용 테스트,
    개인정보처리방침에 '가상 피팅 사진 국외 처리 위탁(FASHN)' 문구 추가(약관 정리 때), 챗봇은 그다음
- 오픈 전 행정: 사업자등록, PG 실계약(성인용품 고지), 통신판매업 신고, 약관 실제 내용,
  포트원 본인인증, 네이버 로그인 검수, 오픈 전 AUTH_DEMO_ALLOW_PROD·ADULT_MOCK_ALLOW_PROD 삭제
- 사업기획서(docx) 6-4~6-6, 7-4에 자사몰 현황·AI 활용안·6개월 판단 기준 반영됨
