import Link from "next/link";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/user";
import CartBadge from "./CartBadge";
import Logo from "./Logo";

export default async function Header() {
  const [cats, user] = await Promise.all([
    prisma.category.findMany({ orderBy: { sort: "asc" } }),
    getUser(),
  ]);
  return (
    <header className="header">
      <div className="wrap header-row">
        <Link href="/" className="logo" aria-label="DUOLOGUE 홈">
          <Logo />
        </Link>
        {/* PC: 한 줄 가운데 / 휴대폰: 아래 줄로 내려가 좌우로 밀어서 보는 메뉴 */}
        <nav className="cats" aria-label="카테고리">
          <Link href="/for-you" className="hl">추천</Link>
          <Link href="/looks">코디</Link>
          {cats.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`} className={c.adultOnly ? "private-link" : undefined}>
              {c.menuName || c.name}
              {c.adultOnly && <span className="r19-mini" title="19세 이상">19</span>}
            </Link>
          ))}
          <Link href="/about">ABOUT</Link>
        </nav>
        <div className="header-actions">
          <Link href={user ? "/mypage" : "/login"} className="account-link">{user ? "마이" : "로그인"}</Link>
          <CartBadge />
        </div>
      </div>
    </header>
  );
}
