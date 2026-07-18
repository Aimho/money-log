import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://moeny-log.netlify.app"),
  applicationName: "축하금 장부",
  title: {
    default: "축하금 장부 | 받은 마음을 간편하게 기록하세요",
    template: "%s | 축하금 장부",
  },
  description: "결혼식과 돌잔치 등 행사별 축하금, 이름, 그룹을 빠르게 기록하고 한눈에 정리하세요.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "축하금 장부",
    title: "축하금 장부 | 받은 마음을 간편하게 기록하세요",
    description: "이름, 그룹, 금액을 한곳에 기록하고 받은 마음을 오래 기억하세요.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "받은 마음을 잊지 않도록, 축하금 장부",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "축하금 장부 | 받은 마음을 간편하게 기록하세요",
    description: "이름, 그룹, 금액을 한곳에 기록하고 받은 마음을 오래 기억하세요.",
    images: ["/opengraph-image"],
  },
  referrer: "same-origin",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
