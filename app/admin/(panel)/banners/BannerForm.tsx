import ActionForm, { SubmitButton } from "@/components/ActionForm";
import ImageUpload from "@/components/ImageUpload";
import { saveBanner } from "../../actions";
import { BRAND } from "@/lib/site";

type B = { id: number; imageUrl: string; tagline: string; title: string; sub: string; link: string; full?: boolean; sort: number; active: boolean };

export default function BannerForm({ b }: { b?: B }) {
  return (
    <ActionForm action={saveBanner} className="form">
      <input type="hidden" name="id" value={b?.id ?? ""} />
      <p className="small muted" style={{ margin: 0 }}>
        세로 사진(3:4~9:16)을 추천해요. 휴대폰에서는 사진 가운데 기준으로 잘려 보여요. 글자는 사진 아래쪽에 올라가요.
      </p>
      <ImageUpload defaultValue={b?.imageUrl} label="배너 사진 (모델 사진)" />
      <label className="check">
        <input type="checkbox" name="full" defaultChecked={b?.full ?? false} /> 글자까지 들어간 완성 이미지 (자르지 않고 통째로 보여주고, 아래 문구는 올리지 않아요)
      </label>
      <label>작은 영문 문구<input name="tagline" defaultValue={b?.tagline ?? BRAND.tagline} placeholder={BRAND.tagline} /></label>
      <label>큰 제목<input name="title" defaultValue={b?.title ?? BRAND.headline} placeholder={BRAND.headline} /></label>
      <label>한 줄 설명<input name="sub" defaultValue={b?.sub ?? ""} placeholder="서로 다른 취향, 하나의 감각." /></label>
      <label>누르면 이동할 곳 (선택)
        <input name="link" defaultValue={b?.link ?? ""} placeholder="/category/outer 또는 /line/formal" />
      </label>
      <div className="row">
        <label>순서<input name="sort" type="number" defaultValue={b?.sort ?? 0} /></label>
        <label className="check" style={{ alignSelf: "end" }}><input type="checkbox" name="active" defaultChecked={b?.active ?? true} /> 노출</label>
      </div>
      <SubmitButton />
    </ActionForm>
  );
}
