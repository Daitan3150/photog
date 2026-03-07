'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { checkInvitationCode } from '@/lib/actions/invitation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Camera, Info, Ticket, Check } from 'lucide-react';
import IssuanceMascot from '@/components/admin/IssuanceMascot';
import Link from 'next/link';

export default function ClaimInvitePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const codeFromUrl = searchParams.get('code');

    const [status, setStatus] = useState<'loading' | 'idle' | 'error' | 'issuing' | 'revealed'>('loading');
    const [error, setError] = useState('');
    const [validCode, setValidCode] = useState('');
    const [isShaking, setIsShaking] = useState(false);

    useEffect(() => {
        if (!codeFromUrl) {
            setStatus('error');
            setError('招待コードが指定されていません。正しいリンクからアクセスしてください。');
            return;
        }
        verifyCode();
    }, [codeFromUrl]);

    const verifyCode = async () => {
        const result = await checkInvitationCode(codeFromUrl!);
        if (result.success) {
            setValidCode(result.code!);
            setStatus('idle');
        } else {
            setStatus('error');
            setError(result.error || 'コードの検証に失敗しました。');
        }
    };

    const handleClaim = () => {
        if (status !== 'idle') return;

        setStatus('issuing');

        // Shake Effect
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 200);

        // Transition to revealed after mascot animation (IssuanceMascot has internal timers)
        setTimeout(() => {
            setStatus('revealed');
        }, 3000);
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-2 border-pink-200 border-t-pink-500 rounded-full"
                />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#FDFCFB] text-gray-900 overflow-x-hidden p-6 md:p-12 selection:bg-pink-100">
            {/* Background Orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-pink-50 rounded-full blur-[150px] opacity-60" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-50 rounded-full blur-[150px] opacity-60" />
            </div>

            <div className="max-w-4xl mx-auto flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12 space-y-4"
                >
                    <span className="inline-block px-4 py-1.5 bg-pink-100/50 text-pink-600 rounded-full text-[10px] font-bold tracking-[0.3em] uppercase">Special Invitation</span>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900">
                        招待コードを受け取る
                    </h1>
                    <p className="text-gray-400 font-medium max-w-lg mx-auto leading-relaxed">
                        特別なポートフォリオへの鍵が届いています。<br className="hidden md:block" />
                        下のボタンを押して、あなただけの招待コードを現像しましょう。
                    </p>
                </motion.div>

                <motion.div
                    animate={isShaking ? { x: [-10, 10, -10, 10, 0], y: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-[0_30px_100px_rgba(0,0,0,0.05)] border border-white relative overflow-visible mb-12"
                >
                    <AnimatePresence>
                        {status === 'issuing' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute top-10 right-10 z-50 pointer-events-none"
                            >
                                <span className="text-5xl font-black text-pink-500 italic drop-shadow-md">KASHA!!</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <IssuanceMascot
                        isIssuing={status === 'issuing' || status === 'revealed'}
                        lastCode={validCode}
                    />

                    <div className="mt-8 text-center px-4 relative z-10">
                        {status === 'idle' && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleClaim}
                                className="group bg-gray-900 text-white px-8 py-5 rounded-[2rem] font-bold shadow-2xl overflow-hidden relative"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3 text-lg">
                                    <Sparkles className="text-yellow-400" />
                                    招待コードを発行する
                                </span>
                                <motion.div
                                    animate={{ x: ['100%', '-100%'] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                                />
                            </motion.button>
                        )}

                        {status === 'revealed' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="p-4 bg-gray-50 border border-gray-100 rounded-3xl flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Your Personal Code</span>
                                    <div className="text-3xl font-black font-mono tracking-tighter text-gray-900 flex items-center gap-3">
                                        <Ticket className="text-pink-500" />
                                        {validCode}
                                    </div>
                                </div>

                                <Link
                                    href={`/register/form?code=${validCode}`}
                                    className="block w-full bg-gray-900 text-white py-5 px-6 rounded-3xl font-bold text-lg shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
                                >
                                    このまま登録を続ける
                                    <ArrowRight size={20} />
                                </Link>
                            </motion.div>
                        )}

                        {status === 'error' && (
                            <div className="space-y-6">
                                <div className="p-6 bg-red-50 text-red-600 rounded-3xl border border-red-100 text-sm flex items-center gap-3">
                                    <Info size={20} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                                <Link
                                    href="/"
                                    className="block w-full bg-gray-100 text-gray-600 py-4 px-6 rounded-3xl font-bold text-sm hover:bg-gray-200 transition-all"
                                >
                                    トップページへ戻る
                                </Link>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Footer Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-center text-gray-300 text-[10px] font-bold uppercase tracking-[0.3em]"
                >
                    &copy; {new Date().getFullYear()} DAITAN Portfolio System
                </motion.div>
            </div>
        </main>
    );
}
