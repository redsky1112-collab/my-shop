import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: SITE.name, description: `${SITE.name} 온라인 쇼핑몰` };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
