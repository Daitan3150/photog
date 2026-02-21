'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserRole } from '@/lib/firebase/user';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const registered = searchParams.get('registered');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            // By calling getUserRole here, it will be cached in sessionStorage as implemented in user.ts
            await getUserRole(userCredential.user.uid);

            // Immediate redirect. AuthProvider will see the user and the cached role.
            router.push('/admin');
        } catch (err: any) {
            setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
            console.error(err);
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

                {error && <p className="text-red-500 mb-4 text-center text-sm">{error}</p>}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Sign In
                    </button>
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
