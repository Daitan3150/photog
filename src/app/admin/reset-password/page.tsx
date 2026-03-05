'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Client-side auth
import Link from 'next/link';

export default function ResetPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            await sendPasswordResetEmail(auth, email);
            setMessage('パスワードリセット用のメールを送信しました。メールボックスをご確認ください。');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/user-not-found') {
                setError('登録されていないメールアドレスです。');
            } else {
                setError('メールの送信に失敗しました。もう一度お試しください。');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">パスワードリセット</h1>

                {message ? (
                    <div className="text-center">
                        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">
                            {message}
                        </div>
                        <Link href="/admin/login" className="text-blue-600 hover:underline">
                            ログイン画面に戻る
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleReset} className="space-y-4">
                        <p className="text-sm text-gray-600 mb-4">
                            登録したメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
                        </p>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="example@email.com"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? '送信中...' : 'リセットメールを送信'}
                        </button>

                        <div className="text-center mt-4">
                            <Link href="/admin/login" className="text-sm text-gray-500 hover:text-gray-800">
                                キャンセルして戻る
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
