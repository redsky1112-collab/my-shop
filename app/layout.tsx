import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { SITE, BRAND } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: `${SITE.name} | ${BRAND.headline}`, template: `%s | ${SITE.name}` },
  description: BRAND.lead,
};

// 휴대폰 화면 폭에 맞추기 + 휴대폰 브라우저 상단 색
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F382C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
