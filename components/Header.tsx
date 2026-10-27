import Link from "next/link";
import { prisma } from "@/lib/db";
import { isAdultVerified } from "@/lib/adult";
import CartBadge from "./CartBadge";
import { SITE } from "@/lib/site";

export default async function Header() {
  const [cats, adultOk] = await Promise.all([
    prisma.category.findMany({ orderBy: { sort: "asc" } }),
    isAdultVerified(),
  ]);
  return (
    <header className="header">
      <div className="wrap header-row">
        <Link href="/" className="logo">
          {SITE.name}
        </Link>
        <nav className="cats">
          {cats.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`}>
              {c.name}
              {c.adultOnly && !adultOk && <span className="r19-mini">19</span>}
            </Link>
          ))}
        </nav>
        <CartBadge />
      </div>
    </header>
  );
}
