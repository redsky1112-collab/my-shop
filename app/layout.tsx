import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { SITE, BRAND } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: `${SITE.name} | ${BRAND.headline}`, template: `%s | ${SITE.name}` },
  description: BRAND.lead,
  // 카톡·문자 등으로 링크를 공유하면 로고 카드(app/opengraph-image.png)가 뜨고, 누르면 사이트로 접속
  metadataBase: new URL("https://www.duologue.co.kr"),
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "ko_KR",
    url: "/",
    title: `${SITE.name} | ${BRAND.headline}`,
    description: BRAND.lead,
  },
  twitter: { card: "summary" },
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
