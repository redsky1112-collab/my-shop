import { getLooks, getRecProducts } from "@/lib/catalog";
import ForYou from "@/components/ForYou";

export default async function ForYouPage() {
  const [products, looks] = await Promise.all([getRecProducts(), getLooks()]);
  const lite = looks.map((l) => ({
    slug: l.slug, title: l.title, imageUrl: l.imageUrl, gender: l.gender, styles: l.styles,
    names: l.items.map((i) => i.product.name),
  }));
  return (
    <>
      <h1 className="page-title">나를 위한 추천</h1>
      <ForYou products={products} looks={lite} />
    </>
  );
}
