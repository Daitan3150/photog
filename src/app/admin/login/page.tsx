'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
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
    const [error, setError] = useState('');
    const [isEmergencyAvailable, setIsEmergencyAvailable] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const registered = searchParams.get('registered');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setIsEmergencyAvailable(false);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            // By calling getUserRole here, it will be cached in sessionStorage as implemented in user.ts
            await getUserRole(userCredential.user.uid);

            // Immediate redirect. AuthProvider will see the user and the cached role.
            router.push('/admin');
        } catch (err: any) {
            console.error(err);
            if (err.code?.includes('referer-') || err.message?.includes('referer')) {
                setError('このドメインからの認証がブロックされています（Firebase設定の問題）。');
                setIsEmergencyAvailable(true);
            } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
            } else {
                setError(`エラー: ${err.shortMessage || err.message || 'ログインに失敗しました。'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEmergencyLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await emergencySignIn(email, password);
            if (result.success && result.token) {
                // カスタムトークンでサインイン
                const userCredential = await signInWithCustomToken(auth, result.token);
                await getUserRole(userCredential.user.uid);
                router.push('/admin');
            } else {
                setError(result.error || '緊急ログインに失敗しました。');
            }
        } catch (err: any) {
            console.error(err);
            setError('システムエラーが発生しました。管理者に連絡してください。');
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

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                            placeholder="admin@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50"
                    >
                        {loading && !isEmergencyAvailable ? 'Signing in...' : 'Sign In'}
                    </button>

                    {isEmergencyAvailable && (
                        <motion.button
                            type="button"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={handleEmergencyLogin}
                            disabled={loading}
                            className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-slate-900 hover:bg-black text-white rounded-xl font-black transition-all shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50"
                        >
                            <ShieldAlert className="w-5 h-5" />
                            {loading ? 'Bypassing...' : 'Emergency Bypass (Server Login)'}
                        </motion.button>
                    )}
                </form>
                <div className="mt-4 text-center text-sm space-y-2">
                    <div>
                        <Link href="/admin/help" className="text-gray-500 hover:text-blue-600 font-bold flex items-center justify-center gap-1 transition-colors">
                            <HelpCircle size={16} />
                            ID・パスワードをお忘れの方はこちら
                        </Link>
                    </div>
                    <div className="pt-4 border-t">
                        <p className="text-gray-500 mb-2">モデル・レイヤーの方はこちら</p>
                        <Link
                            href="/register/form"
                            className="inline-block w-full py-2 px-4 border border-fuchsia-600 text-fuchsia-600 rounded-md text-sm font-bold hover:bg-fuchsia-50 transition-colors"
                        >
                            新規モデル登録 (招待制)
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
