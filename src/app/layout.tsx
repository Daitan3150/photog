import type { Metadata } from "next";
import { Inter, Noto_Serif_JP } from "next/font/google";
import { getSiteSettings } from '@/lib/actions/settings';
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

// Cloudinary画像のURLにOGP最適化変換パラメータを付与する
function optimizeCloudinaryUrl(url: string): string {
  if (!url.includes('res.cloudinary.com')) return url;
  // /upload/ の後に変換パラメータを挿入
  return url.replace(
    '/upload/',
    '/upload/c_fill,w_1200,h_630,f_jpg,q_80/'
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const metadataBase = new URL("https://next-portfolio-lime-one.vercel.app");
  const rawSiteImage = settings?.ogp?.siteImage || '/images/og-base.jpg';
  const resolvedImage = rawSiteImage?.startsWith('http')
    ? rawSiteImage
    : new URL(rawSiteImage, metadataBase).toString();
  const siteImage = optimizeCloudinaryUrl(resolvedImage);

  return {
    metadataBase,
    icons: {
      icon: '/favicon.png',
      apple: '/favicon.png',
    },
    title: {
      template: "%s | DAITAN フォトグラファー | 北海道・小樽",
      default: "DAITAN | 北海道・小樽のフォトグラファー | ポートレート・スナップ撮影",
    },
    description: "北海道小樽市を拠点に活動するフォトグラファー DAITAN（ダイタン）のポートフォリオ。ポートレート、スナップ、コスプレ撮影など、一瞬を切り取るクリエイティブな写真を提供します。出張撮影のご依頼も受付中。",
    openGraph: {
      title: "DAITAN | Portrait & Snapshot Photographer",
      description: "Capture the moment. Portfolio of Daitan.",
      url: metadataBase.toString(),
      siteName: "DAITAN Portfolio",
      locale: "ja_JP",
      type: "website",
      images: siteImage ? [{ url: siteImage, alt: 'DAITAN Portfolio', width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: "DAITAN | Photographer",
      creator: "@daitan_photo",
      images: siteImage ? [siteImage] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
    verification: {
      google: "n0Q1yjElyOG9TOlPhc1LpKl80o8tafJAuLW0MSt7MI8",
    },
  };
}

import AppShell from '@/components/AppShell';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} ${notoSerifJP.variable} font-sans antialiased`}>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
