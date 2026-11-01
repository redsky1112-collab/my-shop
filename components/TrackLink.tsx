import { courierOf, trackFallbackUrl, trackUrl } from "@/lib/couriers";

/** 배송조회 버튼 (택배사 페이지 새 창) + 예비 조회 링크 */
export default function TrackLink({ courier, trackingNo, label = "배송조회" }: { courier?: string | null; trackingNo?: string | null; label?: string }) {
  if (!trackingNo) return null;
  return (
    <span className="track">
      <a href={trackUrl(courier, trackingNo)} target="_blank" rel="noopener noreferrer" className="btn small outline">
        {label}
      </a>
      <span className="small muted">
        {courierOf(courier).name} {trackingNo} ·{" "}
        <a href={trackFallbackUrl(courier, trackingNo)} target="_blank" rel="noopener noreferrer" className="link">안 열리면</a>
      </span>
    </span>
  );
}
