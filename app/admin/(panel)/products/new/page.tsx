import { requireAdmin } from "@/lib/admin";
import ProductForm from "../ProductForm";

export default async function NewProduct() {
  await requireAdmin();
  return (<><h1 className="page-title">상품 등록</h1><ProductForm /></>);
}
