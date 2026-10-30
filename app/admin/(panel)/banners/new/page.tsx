import { requireAdmin } from "@/lib/admin";
import BannerForm from "../BannerForm";

export default async function NewBanner() {
  await requireAdmin();
  return (<><h1 className="page-title">배너 추가</h1><BannerForm /></>);
}
