import type { Metadata } from "next";
import { Inter, Noto_Serif_JP } from "next/font/google"; // Changed Playfair_Display to Noto_Serif_JP directly based on usage
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const notoSerifJP = Noto_Serif_JP({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif-jp",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://next-portfolio-lime-one.vercel.app"),
  title: {
    template: "%s | DAITAN フォトグラファー | 北海道・小樽",
    default: "DAITAN | 北海道・小樽のフォトグラファー | ポートレート・スナップ撮影",
  },
  description: "北海道小樽市を拠点に活動するフォトグラファー DAITAN（ダイタン）のポートフォリオ。ポートレート、スナップ、コスプレ撮影など、一瞬を切り取るクリエイティブな写真を提供します。出張撮影のご依頼も受付中。",
  openGraph: {
    title: "DAITAN | Portrait & Snapshot Photographer",
    description: "Capture the moment. Portfolio of Daitan.",
    url: "https://next-portfolio-lime-one.vercel.app",
    siteName: "DAITAN Portfolio",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DAITAN | Photographer",
    creator: "@daitan_photo", // Replace with actual Twitter handle if known, or remove
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "n0Q1yjElyOG9TOlPhc1LpKl80o8tafJAuLW0MSt7MI8",
  },
};

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AnalyticsProvider from "@/components/AnalyticsProvider";

import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import SecurityProvider from "@/components/SecurityProvider";
import MaintenanceOverlay from "@/components/MaintenanceOverlay";
import JsonLd from "@/components/seo/JsonLd";

import SeasonalBackground from "@/components/effects/SeasonalBackground";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} ${notoSerifJP.variable} font-sans antialiased`}>
        <AnalyticsProvider>
          <LanguageProvider>
            <SecurityProvider>
              <SeasonalBackground />
              <MaintenanceOverlay />
              <JsonLd type="Photographer" />
              <JsonLd type="WebSite" />
              <Header />
              {children}
              <Footer />
            </SecurityProvider>
          </LanguageProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
