import { requireAdmin } from "@/lib/admin";
import LookForm from "../LookForm";

export default async function NewLook() {
  await requireAdmin();
  return (<><h1 className="page-title">코디 등록</h1><LookForm /></>);
}
