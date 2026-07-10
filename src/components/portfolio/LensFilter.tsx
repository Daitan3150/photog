"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface LensFilterProps {
    currentLens: string;
    lensOptions: string[];
}

export default function LensFilter({ currentLens, lensOptions }: LensFilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isOpen, setIsOpen] = useState(true);

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
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
            >
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gray-400">
                        レンズを選択
                    </p>
                    <p className="mt-1 text-xs text-gray-600">レンズを選択すると、そのレンズの作例だけが表示されます。</p>
                </div>
                <span className="text-sm font-semibold text-gray-700">{isOpen ? '閉じる' : '開く'}</span>
            </button>

            {isOpen && (
                <div className="mt-4 overflow-x-auto pb-2">
                    <div className="flex gap-2 min-w-max">
                        {lensOptions.map((lens) => (
                            <button
                                key={lens}
                                type="button"
                                onClick={() => selectLens(lens)}
                                className={`min-w-max rounded-full border px-3 py-2 text-left transition-all text-xs font-semibold ${currentLens === lens ? 'border-black bg-black text-white shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-white'}`}
                            >
                                {lens}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
