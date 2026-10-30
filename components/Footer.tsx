import Link from "next/link";
import { SITE, BRAND } from "@/lib/site";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-brand"><Logo /><span>{BRAND.slogan}</span></div>
        <nav className="footer-links">
          <Link href="/about">브랜드 소개</Link>
          <Link href="/policy/terms">이용약관</Link>
          <Link href="/policy/privacy">
            <b>개인정보처리방침</b>
          </Link>
          <Link href="/policy/youth">청소년보호정책</Link>
          <Link href="/order/lookup">주문조회</Link>
        </nav>
        <p>
          상호 {SITE.company} | 대표 {SITE.ceo} | 사업자등록번호 {SITE.bizNo} | 통신판매업신고 {SITE.mailOrderNo}
          <br />
          주소 {SITE.address} | 고객센터 {SITE.phone} | {SITE.email}
          <br />
          개인정보보호책임자 {SITE.privacyOfficer} | 청소년보호책임자 {SITE.youthOfficer}
        </p>
        <p className="muted">© {SITE.name}</p>
      </div>
    </footer>
  );
}
