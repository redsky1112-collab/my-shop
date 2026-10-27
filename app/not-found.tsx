import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <h1 className="page-title">페이지를 찾을 수 없어요</h1>
      <Link href="/" className="btn">홈으로</Link>
    </div>
  );
}
