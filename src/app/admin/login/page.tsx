'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithCustomToken, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserRole } from '@/lib/firebase/user';
import { emergencySignIn } from '@/lib/actions/auth-recovery';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, AlertCircle, ShieldAlert } from 'lucide-react';

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isEmergencyAvailable, setIsEmergencyAvailable] = useState(false);
    const [mode, setMode] = useState<'login' | 'forgot'>('login');
    const [resetEmail, setResetEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const registered = searchParams.get('registered');



    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setIsEmergencyAvailable(false);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await getUserRole(userCredential.user.uid);
            router.push('/admin');
        } catch (err: any) {
            console.error(err);
            const errorCode = err.code || '';
            const errorMessage = err.message || '';

            if (errorCode.includes('referer-') || errorMessage.includes('referer') ||
                errorCode === 'auth/configuration-not-found' || errorCode === 'auth/internal-error') {
                setError(`設定エラーが発生しました (${errorCode})。ドメイン制限か、Firebaseコンソールでの有効化が必要です。`);
                setIsEmergencyAvailable(true);
            } else if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
                setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
            } else {
                setError(`エラー: ${err.shortMessage || errorCode || errorMessage || 'ログインに失敗しました。'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // First, try Firebase's built-in reset email function
            await sendPasswordResetEmail(auth, resetEmail);
            setSuccessMessage('パスワード再設定メールを送信しました。メールボックスを確認してください。');
        } catch (fbErr: any) {
            console.error('Firebase Auth Reset failed, attempting server fallback:', fbErr);
            // Fallback to server action (Resend) if Firebase client auth fails
            try {
                const { requestPasswordResetServer } = await import('@/lib/actions/auth-recovery');
                const result = await requestPasswordResetServer(resetEmail);

                if (result.success) {
                    setSuccessMessage('パスワード再設定メールを送信しました（サーバー経由）。メールボックスを確認してください。');
                    if (result.method === 'debug') {
                        setError('注意: APIキー未設定のためサーバーログを確認してください。');
                    }
                } else {
                    // if it fails and it's from Resend's domain error, we can catch that.
                    if (result.error?.includes('verify a domain')) {
                        setError('メールシステム設定エラー: テスト用メールアドレスにしか送信できない状態です（Resendのドメイン未承認）。Firebase設定またはResendドメイン設定をご確認ください。');
                    } else {
                        setError(result.error || '再設定のリクエストに失敗しました。');
                    }
                }
            } catch (err: any) {
                setError('システムエラーが発生しました。時間を置いて再度お試しください。');
            }
        } finally {
            setLoading(false);
        }
    };



    const handleEmergencyLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await emergencySignIn(email, password);
            if (result.success && result.token) {
                const userCredential = await signInWithCustomToken(auth, result.token);
                await getUserRole(userCredential.user.uid);
                router.push('/admin');
            } else {
                setError(result.error || '緊急ログインに失敗しました。');
            }
        } catch (err: any) {
            console.error('Emergency Login Failed Detail:', err);
            setError(`緊急ログインエラー: ${err.code || err.message || '不明なシステムエラー'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>


                {registered && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 text-sm font-medium border border-green-100 text-center"
                    >
                        ✅ ユーザー登録が完了しました！<br />ログインしてください。
                    </motion.div>
                )}

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-start gap-3"
                        >
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="text-xs font-bold leading-relaxed">{error}</div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {mode === 'login' ? (
                    <>
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">EMAIL</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400 bg-yellow-50"
                                    placeholder="admin@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">PASSWORD</label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400 bg-yellow-50"
                                    placeholder="••••••••••••"
                                    required
                                />
                            </div>

                            <button
                                id="sign-in-button"
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 flex items-center justify-center uppercase tracking-wider"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>

                        {isEmergencyAvailable && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4"
                            >
                                <button
                                    id="emergency-bypass-button"
                                    onClick={handleEmergencyLogin}
                                    disabled={loading}
                                    className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-lg shadow-xl border border-slate-700 transition-all duration-300 flex items-center justify-center gap-2 group"
                                >
                                    <ShieldAlert className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
                                    <span>Emergency Bypass (Server Login)</span>
                                </button>
                                <p className="text-[10px] text-gray-400 text-center mt-2 px-4 italic leading-tight">
                                    ※FirebaseのReferer制限や設定エラーを回避するためのサーバーサイド認証です。
                                </p>
                            </motion.div>
                        )}

                        <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
                            <button
                                onClick={() => { setMode('forgot'); setError(null); setSuccessMessage(null); }}
                                className="w-full text-center text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center justify-center gap-2 transition-colors"
                            >
                                <HelpCircle className="w-4 h-4" />
                                ID・パスワードをお忘れの方はこちら
                            </button>

                            <div className="text-center">
                                <span className="text-xs text-gray-400 uppercase tracking-widest">モデル・レイヤーの方はこちら</span>
                            </div>

                            <Link
                                href="/admin/register"
                                className="block w-full text-center py-3 border-2 border-fuchsia-100 text-fuchsia-600 font-bold rounded-lg hover:bg-fuchsia-50 transition-all duration-300"
                            >
                                新規モデル登録 (招待制)
                            </Link>
                        </div>
                    </>
                ) : mode === 'forgot' ? (
                    <>
                        <h2 className="text-lg font-bold text-gray-800 mb-4">RESET PASSWORD</h2>
                        <form onSubmit={handlePasswordReset} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">EMAIL</label>
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="登録済みのメールアドレス"
                                    required
                                />
                            </div>

                            {successMessage && (
                                <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
                                    {successMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gray-800 text-white font-bold rounded-lg hover:bg-black transition-all"
                            >
                                {loading ? '処理中...' : '再設定メールを送信'}
                            </button>

                            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setMode('login'); setError(null); setSuccessMessage(null); }}
                                    className="text-sm text-gray-500 hover:text-blue-600"
                                >
                                    ← ログインに戻る
                                </button>

                            </div>
                        </form>
                    </>
                ) : null}
            </div>
        </div>
    );
}
