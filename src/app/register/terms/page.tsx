'use client';

import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function TermsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [hasRead, setHasRead] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const textRef = useRef<HTMLDivElement>(null);

    const code = searchParams.get('code') || '';

    const handleScroll = () => {
        if (textRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = textRef.current;
            if (scrollTop + clientHeight >= scrollHeight - 5) {
                setHasRead(true);
            }
        }
    };

    const handleNext = () => {
        if (agreed) {
            router.push(`/register/form?code=${code}`);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-gray-100">
                <div className="text-center mb-8">
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4">Agreement</span>
                    <h1 className="text-3xl font-black mb-2 text-gray-900 tracking-tight">利用規約への同意</h1>
                    <p className="text-gray-400 font-medium text-sm">
                        サービスを開始する前に、以下の内容をご確認ください。
                    </p>
                </div>

                <div
                    ref={textRef}
                    onScroll={handleScroll}
                    className="border border-gray-100 rounded-[1.5rem] p-6 h-80 overflow-y-scroll mb-8 bg-gray-50/50 text-sm leading-relaxed text-gray-600 shadow-inner custom-scrollbar"
                >
                    <h2 className="font-bold text-gray-900 text-base mb-3">1. はじめに</h2>
                    <p className="mb-6">
                        この利用規約（以下、「本規約」といいます。）は、DAITAN（以下、「管理者」といいます。）が提供するポートフォリオサイトおよび関連サービス（以下、「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆様（以下、「ユーザー」といいます。）には、本規約に従って本サービスをご利用いただきます。
                    </p>

                    <h2 className="font-bold text-gray-900 text-base mb-3">2. 写真の著作権と肖像権</h2>
                    <p className="mb-6">
                        本サービスに掲載される写真の著作権は、原則として撮影者（管理者）に帰属します。被写体となるユーザー（モデル・レイヤー）は、自身の肖像が本サービス上で公開されることに同意するものとします。<br />
                        ユーザーは、自身の写っている写真を個人のSNS等で利用することができますが、商用利用や無断での第三者への提供は禁止します。
                    </p>

                    <h2 className="font-bold text-gray-900 text-base mb-3">3. 禁止事項</h2>
                    <p className="mb-6 space-y-2">
                        ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。<br />
                        ・法令または公序良俗に違反する行為<br />
                        ・犯罪行為に関連する行為<br />
                        ・サーバーまたはネットワークの機能を破壊したり、妨害したりする行為<br />
                        ・他のユーザーの個人情報を収集したり、蓄積したりする行為<br />
                        ・反社会的勢力に対して直接または間接に利益を供与する行為
                    </p>

                    <h2 className="font-bold text-gray-900 text-base mb-3">4. サービスの停止</h2>
                    <p className="mb-6">
                        管理者は、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
                    </p>

                    <h2 className="font-bold text-gray-900 text-base mb-3">5. 利用規約の変更</h2>
                    <p className="mb-6">
                        管理者は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
                    </p>

                    <h2 className="font-bold text-gray-900 text-base mb-3">6. 準拠法・裁判管轄</h2>
                    <p className="mb-4">
                        本規約の解釈にあたっては、日本法を準拠法とします。
                    </p>
                    <div className="text-center text-gray-300 mt-12 mb-4 font-bold tracking-[0.2em] text-[10px] uppercase">
                        End of Terms
                    </div>
                </div>

                <div className="space-y-4">
                    <label className={`flex items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all cursor-pointer select-none ${hasRead
                        ? 'border-blue-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200'
                        : 'border-gray-50 bg-gray-50/30 opacity-40 cursor-not-allowed'
                        }`}>
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            disabled={!hasRead}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded-lg focus:ring-blue-500 disabled:cursor-not-allowed"
                        />
                        <span className={`font-bold text-sm ${hasRead ? 'text-blue-900' : 'text-gray-400'}`}>
                            {hasRead ? "利用規約に同意します" : "最後までスクロールして確認してください"}
                        </span>
                    </label>

                    <div className="flex gap-4">
                        <Link
                            href="/admin/login"
                            className="flex-1 py-4 px-6 border border-gray-100 rounded-2xl text-center text-gray-500 hover:bg-gray-50 font-bold transition-all"
                        >
                            キャンセル
                        </Link>
                        <button
                            onClick={handleNext}
                            disabled={!agreed}
                            className="flex-1 py-4 px-6 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-gray-200 transition-all active:scale-[0.98]"
                        >
                            次へ進む
                        </button>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #F3F4F6;
                        border-radius: 10px;
                    }
                ` }} />
            </div>
        </div>
    );
}

export default function TermsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
        }>
            <TermsContent />
        </Suspense>
    );
}
