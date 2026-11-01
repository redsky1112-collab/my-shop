import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { WishProvider } from "@/components/WishProvider";

export const dynamic = "force-dynamic";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <WishProvider>
      <Header />
      <main className="wrap main">{children}</main>
      <Footer />
    </WishProvider>
  );
}
