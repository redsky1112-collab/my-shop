import Link from "next/link";
import { prisma } from "@/lib/db";
import { isAdultVerified } from "@/lib/adult";
import { getUser } from "@/lib/user";
import CartBadge from "./CartBadge";
import { SITE } from "@/lib/site";

export default async function Header() {
  const [cats, adultOk, user] = await Promise.all([
    prisma.category.findMany({ orderBy: { sort: "asc" } }),
    isAdultVerified(),
    getUser(),
  ]);
  return (
    <header className="header">
      <div className="wrap header-row">
        <Link href="/" className="logo">
          {SITE.name}
        </Link>
        <nav className="cats">
          <Link href="/for-you" className="hl">추천</Link>
          <Link href="/looks">코디</Link>
          {cats.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`}>
              {c.name}
              {c.adultOnly && !adultOk && <span className="r19-mini">19</span>}
            </Link>
          ))}
        </nav>
        <Link href={user ? "/mypage" : "/login"} className="account-link">{user ? "마이" : "로그인"}</Link>
        <CartBadge />
      </div>
    </header>
  );
}
