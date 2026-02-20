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
  metadataBase: new URL("https://next-portfolio-eosin-eight.vercel.app"),
  title: {
    template: "%s | DAITAN",
    default: "DAITAN | Portrait & Snapshot Photographer",
  },
  description: "Portfolio of Daitan, a photographer based in Otaru, Hokkaido. featuring portraits, snapshots, and conceptual photography.",
  openGraph: {
    title: "DAITAN | Portrait & Snapshot Photographer",
    description: "Capture the moment. Portfolio of Daitan.",
    url: "https://next-portfolio-eosin-eight.vercel.app",
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
