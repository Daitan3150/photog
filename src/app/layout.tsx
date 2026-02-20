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
  title: "Portfolio | Photographer",
  description: "Photography portfolio featuring landscapes, portraits, and urban scenes.",
  openGraph: {
    title: "Portfolio | Photographer",
    description: "Photography portfolio featuring landscapes, portraits, and urban scenes.",
    url: "https://next-portfolio-lime-one.vercel.app",
    siteName: "Photographer Portfolio",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Portfolio | Photographer",
    description: "Photography portfolio featuring landscapes, portraits, and urban scenes.",
  },
};

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AnalyticsProvider from "@/components/AnalyticsProvider";

import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import SecurityProvider from "@/components/SecurityProvider";
import MaintenanceOverlay from "@/components/MaintenanceOverlay";

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
              <MaintenanceOverlay />
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
