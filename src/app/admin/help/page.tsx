'use client';

import { useState } from 'react';
import { getEmailHint, requestPasswordResetServer } from '@/lib/actions/auth-recovery';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, Key, HelpCircle, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';

export default function AdminHelpPage() {
    const [step, setStep] = useState<'selection' | 'forgot-id' | 'forgot-password' | 'success'>('selection');
    const [input, setInput] = useState('');
    const [hint, setHint] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleIdHint = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const result = await getEmailHint(input);
        if (result.success) {
            setHint(result.hint || '');
        } else {
            setError(result.error || '見つかりませんでした。');
        }
        setLoading(false);
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await sendPasswordResetEmail(auth, input);
            setSuccessMessage('再設定メールを送信しました。メールボックスを確認してください。');
            setStep('success');
        } catch (fbErr: any) {
            console.error('Firebase Reset failed, fallback to server:', fbErr);
            const result = await requestPasswordResetServer(input);
            if (result.success) {
                setSuccessMessage(result.method === 'email'
                    ? '再設定メールを送信しました。メールボックスを確認してください。'
                    : 'リクエストを受け付けました。管理者に連絡してください。');
                setStep('success');
            } else {
                if (result.error?.includes('verify a domain')) {
                    setError('メールシステム設定エラー: テスト用メールアドレスにしか送信できない状態です（Resendのドメイン未承認）。Firebase設定またはResendドメイン設定をご確認ください。');
                } else {
                    setError(result.error || 'エラーが発生しました。');
                }
            }
        }
        setLoading(false);
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 font-sans">
            <div className="max-w-md w-full">
                <AnimatePresence mode="wait">
                    {step === 'selection' && (
                        <motion.div
                            key="selection"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100"
                        >
                            <div className="flex justify-center mb-6">
                                <div className="bg-blue-50 p-4 rounded-full">
                                    <ShieldCheck className="w-10 h-10 text-blue-600" />
                                </div>
                            </div>
                            <h1 className="text-3xl font-black text-center mb-2 text-slate-800 tracking-tight">Login Help</h1>
                            <p className="text-center text-slate-500 mb-8 font-medium">お困りですか？解決方法を選択してください。</p>

                            <div className="space-y-4">
                                <button
                                    onClick={() => setStep('forgot-id')}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border-2 border-slate-100 hover:border-blue-400 hover:bg-blue-50 transition-all group text-left"
                                >
                                    <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-blue-100 transition-colors">
                                        <Mail className="w-6 h-6 text-slate-600 group-hover:text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">Emailを忘れた</div>
                                        <div className="text-sm text-slate-500 font-medium">ログインIDのヒントを確認する</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setStep('forgot-password')}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border-2 border-slate-100 hover:border-indigo-400 hover:bg-indigo-50 transition-all group text-left"
                                >
                                    <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-indigo-100 transition-colors">
                                        <Key className="w-6 h-6 text-slate-600 group-hover:text-indigo-600" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">パスワードを忘れた</div>
                                        <div className="text-sm text-slate-500 font-medium">再設定用のリンクをメールで送る</div>
                                    </div>
                                </button>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                                <Link href="/admin/login" className="text-slate-400 hover:text-slate-800 flex items-center justify-center gap-2 font-bold transition-colors">
                                    <ArrowLeft size={18} />
                                    ログインに戻る
                                </Link>
                            </div>
                        </motion.div>
                    )}

                    {step === 'forgot-id' && (
                        <motion.div
                            key="forgot-id"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100"
                        >
                            <button onClick={() => setStep('selection')} className="mb-6 text-slate-400 hover:text-slate-600 transition-colors">
                                <ArrowLeft />
                            </button>
                            <h2 className="text-2xl font-black mb-2 text-slate-800">Email Hint</h2>
                            <p className="text-slate-500 mb-6 font-medium">記憶にある文字列の一部を入力してください。</p>

                            <form onSubmit={handleIdHint} className="space-y-6">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="例: daitan..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none transition-all font-bold"
                                        required
                                    />
                                </div>

                                {hint && (
                                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 animate-in zoom-in-95 duration-300">
                                        <div className="text-xs text-blue-600 font-black uppercase mb-1 tracking-wider">Hint</div>
                                        <div className="text-xl font-black text-blue-900 break-all">{hint}</div>
                                    </div>
                                )}

                                {error && <div className="text-red-500 text-sm font-bold">{error}</div>}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black hover:bg-blue-600 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? '検索中...' : 'ヒントを表示'}
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {step === 'forgot-password' && (
                        <motion.div
                            key="forgot-password"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100"
                        >
                            <button onClick={() => setStep('selection')} className="mb-6 text-slate-400 hover:text-slate-600 transition-colors">
                                <ArrowLeft />
                            </button>
                            <h2 className="text-2xl font-black mb-2 text-slate-800">Password Reset</h2>
                            <p className="text-slate-500 mb-6 font-medium">登録したメールアドレスを入力してください。</p>

                            <form onSubmit={handlePasswordReset} className="space-y-6">
                                <div>
                                    <input
                                        type="email"
                                        placeholder="example@email.com"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-400 focus:bg-white outline-none transition-all font-bold"
                                        required
                                    />
                                </div>

                                {error && <div className="text-red-500 text-sm font-bold">{error}</div>}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? '送信中...' : (
                                        <>
                                            <Send size={20} />
                                            リセット情報を送信
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {step === 'success' && (
                        <motion.div
                            key="success"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100 text-center"
                        >
                            <div className="flex justify-center mb-6">
                                <CheckCircle2 className="w-16 h-16 text-green-500" />
                            </div>
                            <h2 className="text-2xl font-black mb-4 text-slate-800">Success!</h2>
                            <p className="text-slate-500 mb-8 font-medium">{successMessage}</p>

                            <Link
                                href="/admin/login"
                                className="inline-block w-full bg-slate-900 text-white p-4 rounded-2xl font-black hover:bg-green-600 transition-all shadow-lg active:scale-95"
                            >
                                ログインに戻る
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mt-8 text-center text-slate-400 font-bold text-sm">
                    DAITAN PORTFOLIO ADMIN RECOVERY SYSTEM
                </div>
            </div>
        </div>
    );
}
