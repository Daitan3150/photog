'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithCustomToken, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
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

    const handleSocialLogin = async (providerName: 'google' | 'apple') => {
        setLoading(true);
        setError(null);
        setIsEmergencyAvailable(false);
        try {
            const provider = providerName === 'google' ? new GoogleAuthProvider() : new OAuthProvider('apple.com');
            const userCredential = await signInWithPopup(auth, provider);
            await getUserRole(userCredential.user.uid);
            router.push('/admin');
        } catch (err: any) {
            console.error('Social Login Error:', err);
            setError(err.message || 'ソーシャルログインに失敗しました。');
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
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 flex items-center justify-center uppercase tracking-wider mb-6"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    'Sign In'
                                )}
                            </button>

                            <div className="relative flex items-center mb-6">
                                <div className="flex-grow border-t border-gray-200"></div>
                                <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">Or</span>
                                <div className="flex-grow border-t border-gray-200"></div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={() => handleSocialLogin('google')}
                                    disabled={loading}
                                    className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-lg shadow-sm transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-70"
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" /><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" /><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" /><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" /></g></svg>
                                    Sign in with Google
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSocialLogin('apple')}
                                    disabled={loading}
                                    className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-lg shadow-sm transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-70"
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.32 15.688c-.017.067-.229.83-.984 1.956-1.042 1.55-2.115 3.093-3.834 3.123-1.683.033-2.222-1.006-4.14-1.006-1.92 0-2.525.975-4.142 1.04-1.685.066-2.909-1.65-3.955-3.155-2.13-3.093-3.766-8.729-1.583-12.526 1.082-1.884 3.016-3.085 5.12-3.12 1.65-.034 3.193 1.11 4.214 1.11 1.018 0 2.883-1.378 4.887-1.178 2.067.202 3.932 1.205 5 2.766-4.524 2.714-3.833 9.07 1.417 11.046zM11.696 4.453c1.013-1.222 1.693-2.924 1.508-4.634-1.46.06-3.237.973-4.28 2.22-1.196 1.43-1.859 3.078-1.508 4.706 1.65.132 3.18-.89 4.28-2.292z" /></svg>
                                    Sign in with Apple
                                </button>
                            </div>
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
