import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isAdultVerified } from "@/lib/adult";
import Thumb from "@/components/Thumb";
import AddToCart from "./AddToCart";
import { won } from "@/lib/format";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await prisma.product.findUnique({ where: { slug }, include: { category: true } });
  if (!p || !p.active) notFound();
  const adult = p.adultOnly || p.category.adultOnly;
  if (adult && !(await isAdultVerified())) redirect(`/adult-verify?next=/product/${slug}`);

  const price = p.salePrice && p.salePrice < p.price ? p.salePrice : p.price;
  const options = p.options.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="detail">
      <Thumb src={p.imageUrl} alt={p.name} />
      <div>
        <div className="muted">{p.category.name}</div>
        <h1 className="detail-name">{p.name}</h1>
        <div className="detail-price">
          {price !== p.price && <s className="muted">{won(p.price)}</s>} <b>{won(price)}</b>
        </div>
        <AddToCart
          item={{ productId: p.id, slug: p.slug, name: p.name, price, adultOnly: adult, imageUrl: p.imageUrl }}
          options={options}
          stock={p.stock}
        />
        <div className="desc">{p.description}</div>
      </div>
    </div>
  );
}
