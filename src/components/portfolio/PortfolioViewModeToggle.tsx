"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface PortfolioViewModeToggleProps {
    currentView: 'category' | 'lens';
}

const VIEW_MODES = [
    { id: 'category', key: 'category' },
    { id: 'lens', key: 'lens' },
];

export default function PortfolioViewModeToggle({ currentView }: PortfolioViewModeToggleProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();

    const params = useMemo(() => {
        const next = new URLSearchParams(searchParams.toString());
        return next;
    }, [searchParams]);

    const setView = (view: 'category' | 'lens') => {
        const nextParams = new URLSearchParams(params.toString());
        nextParams.set('view', view);
        if (view === 'lens') {
            nextParams.delete('category');
        } else {
            if (!nextParams.get('category')) {
                nextParams.set('category', 'cosplay');
            }
            nextParams.delete('lens');
        }
        router.push(`/portfolio?${nextParams.toString()}`);
    };

    return (
        <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <span className="text-xs uppercase tracking-[0.4em] text-gray-500 font-bold">
                {t.portfolio.viewBy}
            </span>
            {VIEW_MODES.map((mode) => (
                <button
                    key={mode.id}
                    type="button"
                    onClick={() => setView(mode.id as 'category' | 'lens')}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${currentView === mode.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    {t.portfolio.viewMode[mode.key as keyof typeof t.portfolio.viewMode]}
                </button>
            ))}
        </div>
    );
}
