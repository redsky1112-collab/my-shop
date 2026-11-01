import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { logout } from "../actions";

export default async function Panel({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <header className="admin-nav">
        <b>관리자</b>
        <Link href="/admin">대시보드</Link>
        <Link href="/admin/orders">주문</Link>
        <Link href="/admin/products">상품</Link>
        <Link href="/admin/looks">코디</Link>
        <Link href="/admin/claims">교환·반품</Link>
        <Link href="/admin/banners">메인 배너</Link>
        <Link href="/admin/categories">카테고리</Link>
        <Link href="/" target="_blank">쇼핑몰 보기</Link>
        <form action={logout}><button className="link">로그아웃</button></form>
      </header>
      <main className="admin-main">{children}</main>
    </>
  );
}
