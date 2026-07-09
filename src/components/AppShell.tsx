'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AnalyticsProvider from '@/components/AnalyticsProvider';
import MaintenanceOverlay from '@/components/MaintenanceOverlay';
import SeasonalBackground from '@/components/effects/SeasonalBackground';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import SecurityProvider from '@/components/SecurityProvider';
import JsonLd from '@/components/seo/JsonLd';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  return (
    <LanguageProvider>
      <SecurityProvider>
        {!isAdmin && <AnalyticsProvider />}
        {!isAdmin && <SeasonalBackground />}
        {!isAdmin && <MaintenanceOverlay />}
        {!isAdmin && <JsonLd type="Photographer" />}
        {!isAdmin && <JsonLd type="WebSite" />}
        {!isAdmin && <Header />}
        {children}
        {!isAdmin && <Footer />}
      </SecurityProvider>
    </LanguageProvider>
  );
}
