'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/analytics';

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    useEffect(() => {
        // Track page view on route change
        if (pathname) {
            trackPageView(pathname);
        }
    }, [pathname]);

    return <>{children}</>;
}
