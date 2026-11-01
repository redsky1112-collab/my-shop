# DUOLOGUE 쇼핑몰 — 작업 인수인계 메모

새 대화에서 이 저장소를 이어 작업할 때 먼저 읽는 문서예요.

## 프로젝트
- 브랜드: DUOLOGUE (3040 컨템포러리 의류 + 성인 전용 라인 PRIVATE DIALOGUE)
- 스택: Next.js 15 (App Router) + Prisma 6 + Neon Postgres, Vercel 배포 (main 푸시 = 운영 배포)
- 테스트 사이트: https://my-shop-sigma-livid.vercel.app (정식 도메인 duologue.co.kr 예정)
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
| 브랜드 | 로고·컬러·ABOUT·모델 배너 슬라이드(관리자 > 메인 배너) | components/Logo, HeroSlider |
| 회원 | 카카오·네이버 로그인, 마이페이지, 테스트 로그인(AUTH_DEMO_ALLOW_PROD) | lib/user.ts |
| 맞춤 추천 | 6단계 진단, 취향·사이즈 추천, 코디 | lib/recommend.ts, style-quiz |
| 라인 | 상품 라인 지정, 카테고리 라인 탭, 대시보드 목표 비중 | lib/lines.ts |
| 재고 | 사이즈별 재고(Variant), 품절·잔여 표시 | lib/stock.ts |
| 결제 | 토스 결제위젯(테스트 키), 옵션 재고 선차감 | api/pay/confirm |
| 취소·환불 | 관리자 전체/부분 취소, 배송비 환불·차감, 고객 배송 전 취소 | lib/refund.ts, admin/orders/[id] |
| 교환·반품 | 고객 신청(기한 7/90일, 사진), 관리자 승인·회수·환불/교환 발송 | lib/claims.ts, admin/claims |
| 배송 | 택배사 선택, 송장 입력 시 자동 배송중, 배송조회 링크 | lib/couriers.ts |
| 선물 포장 | 주문서 선택 +2,000원, 메시지 카드 | (다른 세션에서 반영) |
| 관리자 | 상품(사진 업로드·사이즈 재고), 코디, 카테고리, 주문, 교환·반품, 배너 | app/admin |

## 다음 할 일
- 확인 필요: 택배사 조회 링크가 실제로 열리는지 (lib/couriers.ts 주소)
- 2단계(매출): 상품 사진 여러 장, 체형 리뷰("나와 비슷한 체형"), 찜, 첫 구매 쿠폰, 재입고 알림
- 3단계(AI): 관리자 AI 착용 화보 생성 → AI 상담 챗봇 → 고객 가상 피팅 (API 키 필요)
- 오픈 전 행정: 사업자등록, PG 실계약(성인용품 고지), 통신판매업 신고, 약관 실제 내용,
  포트원 본인인증, 네이버 로그인 검수, 오픈 전 AUTH_DEMO_ALLOW_PROD·ADULT_MOCK_ALLOW_PROD 삭제
- 사업기획서(docx) 6-4~6-6, 7-4에 자사몰 현황·AI 활용안·6개월 판단 기준 반영됨
