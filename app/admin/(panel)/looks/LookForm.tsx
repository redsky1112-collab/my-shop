import { prisma } from "@/lib/db";
import { saveLook } from "../../actions";
import { GENDERS, STYLES, splitTags } from "@/lib/style";
import ImageUpload from "@/components/ImageUpload";

type L = {
  id: number; title: string; slug: string; description: string; imageUrl: string | null;
  gender: string; styles: string; active: boolean; sort: number; items: { productId: number }[];
};

export default async function LookForm({ l }: { l?: L }) {
  const products = await prisma.product.findMany({
    where: { active: true, adultOnly: false, category: { adultOnly: false } },
    include: { category: true },
    orderBy: [{ categoryId: "asc" }, { name: "asc" }],
  });
  const sel = new Set(l?.items.map((i) => i.productId));
  return (
    <form action={saveLook} className="form">
      <input type="hidden" name="id" value={l?.id ?? ""} />
      <label>코디명<input name="title" defaultValue={l?.title} required placeholder="월요일 출근룩" /></label>
      <label>주소용 영문 slug<input name="slug" defaultValue={l?.slug} required pattern="[a-zA-Z0-9\-]+" placeholder="monday-office" /></label>
      <label>설명<textarea name="description" rows={3} defaultValue={l?.description} /></label>
      <ImageUpload defaultValue={l?.imageUrl} label="코디 대표 이미지" />
      <div className="row">
        <label>성별
          <select name="gender" defaultValue={l?.gender ?? "U"}>
            {GENDERS.map((g) => <option key={g.key} value={g.key}>{g.key === "U" ? "공용" : g.label}</option>)}
          </select>
        </label>
        <label>노출 순서<input name="sort" type="number" defaultValue={l?.sort ?? 0} /></label>
      </div>
      <div className="checks">
        {STYLES.map((s) => (
          <label key={s.key} className="check">
            <input type="checkbox" name="styles" value={s.key} defaultChecked={splitTags(l?.styles ?? "").includes(s.key)} /> {s.label}
          </label>
        ))}
      </div>
      <fieldset className="box">
        <legend>코디에 넣을 상품 (2개 이상, 고른 순서와 관계없이 아래 목록 순서로 노출)</legend>
        {products.map((p) => (
          <label key={p.id} className="check">
            <input type="checkbox" name="productIds" value={p.id} defaultChecked={sel.has(p.id)} />
            <span className="muted small">[{p.category.name}]</span> {p.name}
          </label>
        ))}
      </fieldset>
      <label className="check"><input type="checkbox" name="active" defaultChecked={l?.active ?? true} /> 노출</label>
      <button className="btn">저장</button>
    </form>
  );
}
