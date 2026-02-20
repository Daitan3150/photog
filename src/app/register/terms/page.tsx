'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TermsPage() {
    const router = useRouter();
    const [hasRead, setHasRead] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const textRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (textRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = textRef.current;
            // Allow a small buffer (e.g., 5px) for floating point inaccuracies
            if (scrollTop + clientHeight >= scrollHeight - 5) {
                setHasRead(true);
            }
        }
    };

    const handleNext = () => {
        if (agreed) {
            router.push('/admin/register/form');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
                <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">利用規約</h1>
                <p className="text-center text-gray-500 mb-6 text-sm">
                    サービスを利用する前に、以下の規約を最後までお読みください。
                </p>

                <div
                    ref={textRef}
                    onScroll={handleScroll}
                    className="border border-gray-200 rounded-md p-6 h-64 overflow-y-scroll mb-6 bg-gray-50 text-sm leading-relaxed text-gray-700 shadow-inner"
                >
                    <h2 className="font-bold text-base mb-2">1. はじめに</h2>
                    <p className="mb-4">
                        この利用規約（以下、「本規約」といいます。）は、DAITAN（以下、「管理者」といいます。）が提供するポートフォリオサイトおよび関連サービス（以下、「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆様（以下、「ユーザー」といいます。）には、本規約に従って本サービスをご利用いただきます。
                    </p>

                    <h2 className="font-bold text-base mb-2">2. 写真の著作権と肖像権</h2>
                    <p className="mb-4">
                        本サービスに掲載される写真の著作権は、原則として撮影者（管理者）に帰属します。被写体となるユーザー（モデル・レイヤー）は、自身の肖像が本サービス上で公開されることに同意するものとします。<br />
                        ユーザーは、自身の写っている写真を個人のSNS等で利用することができますが、商用利用や無断での第三者への提供は禁止します。
                    </p>

                    <h2 className="font-bold text-base mb-2">3. 禁止事項</h2>
                    <p className="mb-4">
                        ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。<br />
                        ・法令または公序良俗に違反する行為<br />
                        ・犯罪行為に関連する行為<br />
                        ・サーバーまたはネットワークの機能を破壊したり、妨害したりする行為<br />
                        ・他のユーザーの個人情報を収集したり、蓄積したりする行為<br />
                        ・反社会的勢力に対して直接または間接に利益を供与する行為
                    </p>

                    <h2 className="font-bold text-base mb-2">4. サービスの停止</h2>
                    <p className="mb-4">
                        管理者は、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
                    </p>

                    <h2 className="font-bold text-base mb-2">5. 利用規約の変更</h2>
                    <p className="mb-4">
                        管理者は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
                    </p>

                    <h2 className="font-bold text-base mb-2">6. 準拠法・裁判管轄</h2>
                    <p className="mb-2">
                        本規約の解釈にあたっては、日本法を準拠法とします。
                    </p>
                    <p className="text-center text-gray-400 mt-8 mb-4">
                        --- 規約は以上です ---
                    </p>
                </div>

                <div className="flex flex-col gap-4">
                    <label className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer select-none ${hasRead
                            ? 'border-blue-100 bg-blue-50 hover:bg-blue-100'
                            : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        }`}>
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                disabled={!hasRead}
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
                            />
                        </div>
                        <span className={`font-bold ${hasRead ? 'text-blue-800' : 'text-gray-400'}`}>
                            {hasRead ? "利用規約に同意する" : "最後までスクロールしてください"}
                        </span>
                    </label>

                    <div className="flex gap-4">
                        <Link
                            href="/admin/login"
                            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-center text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                        >
                            キャンセル
                        </Link>
                        <button
                            onClick={handleNext}
                            disabled={!agreed}
                            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
                        >
                            次へ進む
                        </button>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-400">
                        Protected by DAITAN Studio
                    </p>
                </div>
            </div>
        </div>
    );
}
