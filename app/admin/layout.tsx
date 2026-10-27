export const dynamic = "force-dynamic";
export const metadata = { title: "관리자", robots: { index: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="admin">{children}</div>;
}
