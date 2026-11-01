/**
 * 택배사 배송조회 링크. 택배사 홈페이지 주소가 바뀌면 여기만 고치면 돼요.
 * 계약한 택배사를 DEFAULT_COURIER 로 두세요.
 */
export const COURIERS = [
  { key: "cj", name: "CJ대한통운", url: (n: string) => `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${n}` },
  { key: "epost", name: "우체국택배", url: (n: string) => `https://service.epost.go.kr/trace.RetrieveRegiPrclDeliv.postal?sid1=${n}` },
  { key: "hanjin", name: "한진택배", url: (n: string) => `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${n}` },
  { key: "lotte", name: "롯데택배", url: (n: string) => `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${n}` },
  { key: "logen", name: "로젠택배", url: (n: string) => `https://www.ilogen.com/web/personal/trace/${n}` },
] as const;

export const DEFAULT_COURIER = "cj";

const clean = (n: string) => n.replace(/[^0-9A-Za-z]/g, "");

export function courierOf(key: string | null | undefined) {
  return COURIERS.find((c) => c.key === (key || DEFAULT_COURIER)) ?? COURIERS[0];
}

/** 택배사 조회 페이지 주소 */
export function trackUrl(courier: string | null | undefined, trackingNo: string) {
  return courierOf(courier).url(encodeURIComponent(clean(trackingNo)));
}

/** 택배사 페이지가 안 열릴 때 쓰는 예비 조회 (네이버 택배 조회) */
export function trackFallbackUrl(courier: string | null | undefined, trackingNo: string) {
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(`${courierOf(courier).name} ${clean(trackingNo)}`)}`;
}
