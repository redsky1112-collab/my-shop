# MY SHOP — 의류 + 성인용품 쇼핑몰 (Next.js)

## 1. 배포 (Vercel, 설치 불필요)

1. neon.tech 가입 → 프로젝트 생성 → Connection string 복사
2. vercel.com → GitHub로 로그인 → Add New Project → `my-shop` Import
3. Environment Variables에 `.env.example` 항목 입력 (DATABASE_URL은 Neon 주소)
4. Deploy → 빌드 때 DB 테이블 생성과 샘플 상품 등록이 자동으로 돼요

## 1-1. 내 PC에서 실행 (선택, Node.js 20 이상 필요)

```bash
cp .env.example .env   # 윈도우: copy .env.example .env
npm install          # 패키지 설치 (+ prisma generate 자동 실행)
npm run setup        # DB 생성 + 샘플 상품 넣기
npm run dev          # http://localhost:3000
```

- 관리자: http://localhost:3000/admin (비밀번호는 `.env`의 `ADMIN_PASSWORD`)
- 결제는 토스페이먼츠 **테스트 키**라서 실제 돈이 나가지 않아요.
- 성인인증은 `ADULT_VERIFY_MODE="mock"`이면 개발용 버튼으로 통과돼요. (운영 환경에서는 자동 차단)

## 2. 들어있는 기능

| 구분 | 기능 |
|---|---|
| 쇼핑 | 메인, 카테고리, 상품상세(옵션·수량), 장바구니, 주문서(다음 주소검색), 비회원 주문조회 |
| 결제 | 토스페이먼츠 결제위젯 v2, 서버 금액 검증, 재고 선차감 후 승인, 실패 시 재고 복구 |
| 성인 | 성인 카테고리·상품은 인증 전 이름·이미지 숨김, 상세·카테고리·주문 단계 서버 검증, 포트원 V2 본인인증 연동 코드, 결제창 주문명에 성인 상품명 비노출 |
| 회원 | 카카오·네이버 로그인(처음이면 자동 가입), 마이페이지(주문 내역·로그아웃·탈퇴), 주문서 자동 채우기, 비회원 주문 유지 |
| 관리자 | 대시보드(배송대기·오늘 매출·재고부족), 상품 등록·수정·판매중지, 사진 직접 업로드(휴대폰 촬영·갤러리, 자동 압축), 주문 상태·송장 입력, 카테고리 추가 |
| 법정표시 | 하단 사업자정보, 이용약관·개인정보처리방침·청소년보호정책 페이지 (뼈대) |

## 3. 폴더 구조

```
app/(shop)/        고객용 화면
app/admin/         관리자 화면 + 서버 액션(actions.ts)
app/api/orders     주문 생성 (가격·재고·성인 여부 서버 재계산)
app/api/pay/confirm 토스 결제 승인
app/api/adult/*    성인인증 처리
lib/site.ts        상호·사업자번호·배송비 설정 ← 여기부터 수정
prisma/schema.prisma DB 구조
```

## 4. 실제 오픈 전 체크리스트

1. `lib/site.ts`의 사업자 정보, 배송비를 실제 값으로 수정
2. `.env`의 `SESSION_SECRET`을 긴 랜덤 문자열로, `ADMIN_PASSWORD`를 강한 비밀번호로 변경
3. 토스페이먼츠 가입·심사 → 라이브 키로 교체 (성인용품 취급 사실을 심사 때 미리 알리세요)
4. 포트원 가입 → 본인인증 채널 추가 → `ADULT_VERIFY_MODE="portone"` + 키 3개 입력
5. 환경변수 `ADULT_MOCK_ALLOW_PROD`, `AUTH_DEMO_ALLOW_PROD` 삭제 (개발용 인증·테스트 로그인 버튼 제거)
6. 배포: Vercel(+ Neon/Supabase Postgres) 추천. 환경변수 모두 등록, `NEXT_PUBLIC_SITE_URL` 실제 도메인
7. 약관·개인정보처리방침·청소년보호정책 실제 내용으로 교체
8. 테스트: 결제 성공/실패/창닫기, 재고 0 상품, 성인 미인증 상태로 성인상품 URL 직접 접근

## 4-1. 카카오·네이버 로그인 켜기

1. **카카오**: developers.kakao.com → 애플리케이션 추가 → 플랫폼 > Web에 사이트 도메인 등록 → 카카오 로그인 활성화 → Redirect URI에 `https://내도메인/api/auth/kakao/callback` 등록 → 동의항목에서 닉네임(필수), 이메일(선택) → 앱 키의 **REST API 키**를 `KAKAO_REST_API_KEY`에
2. **네이버**: developers.naver.com → Application 등록 → 사용 API "네이버 로그인" → 이름·이메일·휴대전화 선택 → 서비스 URL과 Callback URL(`https://내도메인/api/auth/naver/callback`) 등록 → `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 입력
3. Vercel 환경변수에 넣고 Redeploy → 로그인 화면 버튼이 자동으로 켜져요
- 도메인을 바꾸면 두 콘솔의 Redirect URI도 같이 바꿔야 해요.
- 네이버는 검수 전에는 "멤버 관리"에 등록한 아이디만 로그인돼요.

## 5. 아직 없는 기능 (다음 단계)

- 적립금·쿠폰
- 상품 이미지 여러 장(상세 갤러리)
- 관리자 화면에서 결제 취소·환불 (토스 취소 API 연동)
- 주문 알림(카카오 알림톡/문자), 택배 배송조회 연동
