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
        <div className="mt-4 rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gray-400">
                        レンズを選択
                    </p>
                    <p className="mt-1 text-xs text-gray-600">レンズを選択すると、そのレンズの作例だけが表示されます。</p>
                </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {lensOptions.map((lens) => (
                    <button
                        key={lens}
                        type="button"
                        onClick={() => selectLens(lens)}
                        className={`rounded-2xl border px-3 py-2 text-left transition-all text-sm ${currentLens === lens ? 'border-black bg-black text-white shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-white'}`}
                    >
                        <div className="font-semibold">{lens}</div>
                        <div className="mt-1 text-[10px] opacity-70">このレンズの作例を見る</div>
                    </button>
                ))}
            </div>
        </div>
    );
}
