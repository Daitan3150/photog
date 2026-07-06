"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface LensFilterProps {
    currentLens: string;
    lensOptions: string[];
}

export default function LensFilter({ currentLens, lensOptions }: LensFilterProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();

    const params = useMemo(() => {
        const current = new URLSearchParams(searchParams.toString());
        current.delete('page');
        return current;
    }, [searchParams]);

    const selectLens = (lens: string) => {
        const nextParams = new URLSearchParams(params.toString());
        if (lens) {
            nextParams.set('lens', lens);
        } else {
            nextParams.delete('lens');
        }
        router.push(`/portfolio?${nextParams.toString()}`);
    };

    return (
        <div className="mt-4 flex flex-wrap items-center gap-3 border border-gray-100 rounded-3xl bg-white px-4 py-4 shadow-sm">
            <span className="text-xs uppercase tracking-[0.4em] text-gray-500 font-bold">
                {t.portfolio.filterLens}
            </span>
            <button
                type="button"
                onClick={() => selectLens('')}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${currentLens === '' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
                {t.portfolio.lensAll}
            </button>
            {lensOptions.map((lens) => (
                <button
                    key={lens}
                    type="button"
                    onClick={() => selectLens(lens)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${currentLens === lens ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    {lens}
                </button>
            ))}
        </div>
    );
}
