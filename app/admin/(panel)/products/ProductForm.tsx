import { prisma } from "@/lib/db";
import { saveProduct } from "../../actions";

type P = {
  id: number; name: string; slug: string; price: number; salePrice: number | null; description: string;
  imageUrl: string | null; stock: number; options: string; active: boolean; adultOnly: boolean; categoryId: number;
};

export default async function ProductForm({ p }: { p?: P }) {
  const cats = await prisma.category.findMany({ orderBy: { sort: "asc" } });
  return (
    <form action={saveProduct} className="form">
      <input type="hidden" name="id" value={p?.id ?? ""} />
      <label>카테고리
        <select name="categoryId" defaultValue={p?.categoryId} required>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}{c.adultOnly ? " (19)" : ""}</option>)}
        </select>
      </label>
      <label>상품명<input name="name" defaultValue={p?.name} required /></label>
      <label>주소용 영문 slug (예: basic-tee)<input name="slug" defaultValue={p?.slug} required pattern="[a-zA-Z0-9\-]+" /></label>
      <div className="row">
        <label>정가<input name="price" type="number" min={1} defaultValue={p?.price} required /></label>
        <label>할인가 (선택)<input name="salePrice" type="number" min={0} defaultValue={p?.salePrice ?? ""} /></label>
        <label>재고<input name="stock" type="number" min={0} defaultValue={p?.stock ?? 0} required /></label>
      </div>
      <label>옵션 (쉼표 구분, 예: S,M,L)<input name="options" defaultValue={p?.options} /></label>
      <label>이미지 URL<input name="imageUrl" defaultValue={p?.imageUrl ?? ""} placeholder="https://..." /></label>
      <label>상세 설명<textarea name="description" rows={8} defaultValue={p?.description} /></label>
      <label className="check"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> 판매중</label>
      <label className="check"><input type="checkbox" name="adultOnly" defaultChecked={p?.adultOnly} /> 성인 상품 (성인 카테고리는 자동 적용)</label>
      <button className="btn">저장</button>
    </form>
  );
}
