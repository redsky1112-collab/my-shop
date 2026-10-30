import { prisma } from "@/lib/db";
import ActionForm, { SubmitButton } from "@/components/ActionForm";
import { saveLook } from "../../actions";
import { splitTags } from "@/lib/style";
import LookPicker from "./LookPicker";
import ImageUpload from "@/components/ImageUpload";

type L = {
  id: number; title: string; slug: string; description: string; imageUrl: string | null;
  line: string; gender: string; styles: string; active: boolean; sort: number; items: { productId: number; sort: number }[];
};

export default async function LookForm({ l }: { l?: L }) {
  const products = await prisma.product.findMany({
    where: { active: true, adultOnly: false, category: { adultOnly: false } },
    include: { category: true },
    orderBy: [{ categoryId: "asc" }, { name: "asc" }],
  });
  return (
    <ActionForm action={saveLook} className="form">
      <input type="hidden" name="id" value={l?.id ?? ""} />
      <label>코디명<input name="title" defaultValue={l?.title} required placeholder="월요일 출근룩" /></label>
      <label>주소용 영문 이름 (선택, 비우면 자동 생성)<input name="slug" defaultValue={l?.slug} pattern="[a-zA-Z0-9\-]+" placeholder="monday-office" /></label>
      <label>설명<textarea name="description" rows={3} defaultValue={l?.description} /></label>
      <ImageUpload defaultValue={l?.imageUrl} label="코디 대표 이미지" />
      <label>노출 순서<input name="sort" type="number" defaultValue={l?.sort ?? 0} /></label>
      <LookPicker
        products={products.map((p) => ({
          id: p.id, name: p.name, category: p.category.name, line: p.line, gender: p.gender, styles: p.styles,
          imageUrl: p.imageUrl, price: p.salePrice && p.salePrice < p.price ? p.salePrice : p.price,
        }))}
        init={{
          gender: l?.gender ?? "U",
          line: l?.line ?? "",
          styles: splitTags(l?.styles ?? ""),
          selected: [...(l?.items ?? [])].sort((a, b) => a.sort - b.sort).map((i) => i.productId),
        }}
      />
      <label className="check"><input type="checkbox" name="active" defaultChecked={l?.active ?? true} /> 노출</label>
      <SubmitButton />
    </ActionForm>
  );
}
