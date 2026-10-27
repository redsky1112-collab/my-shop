import Link from "next/link";
import Thumb from "./Thumb";
import { won } from "@/lib/format";

type P = {
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  stock: number;
};

export default function ProductCard({ p, adult, adultOk }: { p: P; adult: boolean; adultOk: boolean }) {
  if (adult && !adultOk) {
    return (
      <Link href={`/adult-verify?next=/product/${p.slug}`} className="card">
        <Thumb alt="" masked />
        <div className="card-body">
          <div className="card-name muted">성인인증 후 확인할 수 있어요</div>
        </div>
      </Link>
    );
  }
  const sale = p.salePrice && p.salePrice < p.price;
  return (
    <Link href={`/product/${p.slug}`} className="card">
      <Thumb src={p.imageUrl} alt={p.name} />
      <div className="card-body">
        <div className="card-name">{p.name}</div>
        <div className="card-price">
          {sale ? (
            <>
              <span className="pct">{Math.round((1 - p.salePrice! / p.price) * 100)}%</span>
              <b>{won(p.salePrice!)}</b>
              <s className="muted">{won(p.price)}</s>
            </>
          ) : (
            <b>{won(p.price)}</b>
          )}
        </div>
        {p.stock <= 0 && <div className="soldout">품절</div>}
      </div>
    </Link>
  );
}
