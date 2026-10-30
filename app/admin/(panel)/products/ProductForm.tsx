import { prisma } from "@/lib/db";
import { saveProduct } from "../../actions";
import { FITS, GENDERS, STYLES, splitTags } from "@/lib/style";
import ImageUpload from "@/components/ImageUpload";

type P = {
  id: number; name: string; slug: string; price: number; salePrice: number | null; description: string;
  imageUrl: string | null; stock: number; options: string; active: boolean; adultOnly: boolean; categoryId: number;
  gender: string; styles: string; fit: string; colors: string; sizeChart: string;
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
      <fieldset className="box">
        <legend>스타일 맞춤 정보 (추천·사이즈 추천에 사용)</legend>
        <div className="row">
          <label>성별
            <select name="gender" defaultValue={p?.gender ?? "U"}>
              {GENDERS.map((g) => <option key={g.key} value={g.key}>{g.key === "U" ? "공용" : g.label}</option>)}
            </select>
          </label>
          <label>핏
            <select name="fit" defaultValue={p?.fit ?? ""}>
              <option value="">선택 안 함</option>
              {FITS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </label>
        </div>
        <div className="checks">
          {STYLES.map((s) => (
            <label key={s.key} className="check">
              <input type="checkbox" name="styles" value={s.key} defaultChecked={splitTags(p?.styles ?? "").includes(s.key)} /> {s.label}
            </label>
          ))}
        </div>
        <label>색상 (쉼표 구분)<input name="colors" defaultValue={p?.colors} placeholder="블랙,네이비" /></label>
        <label>실측표 (첫 줄은 항목명, 쉼표 구분)
          <textarea name="sizeChart" rows={5} defaultValue={p?.sizeChart} placeholder={"사이즈,어깨,가슴단면,총장\nM,46,54,70\nL,48,57,72"} />
        </label>
      </fieldset>
      <ImageUpload defaultValue={p?.imageUrl} label="상품 대표 이미지" />
      <label>상세 설명<textarea name="description" rows={8} defaultValue={p?.description} /></label>
      <label className="check"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> 판매중</label>
      <label className="check"><input type="checkbox" name="adultOnly" defaultChecked={p?.adultOnly} /> 성인 상품 (성인 카테고리는 자동 적용)</label>
      <button className="btn">저장</button>
    </form>
  );
}
