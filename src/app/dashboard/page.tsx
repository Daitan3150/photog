'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/admin/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/admin/login');
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-serif font-bold text-gray-900">Model Dashboard</h1>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-gray-500 hover:text-gray-900"
                    >
                        ログアウト
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-lg font-bold mb-4">ようこそ、{user.displayName}さん</h2>
                    <p className="text-gray-600">
                        ここはモデル専用のダッシュボードです。<br />
                        あなたの写真管理やプロフィールの確認ができます。(機能実装中)
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Action Cards */}
                    <Link href="/dashboard/photos/new" className="block group">
                        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition border border-transparent hover:border-blue-500">
                            <div className="text-3xl mb-3">📸</div>
                            <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600">新しい写真を投稿</h3>
                            <p className="text-gray-500 text-sm">ポートフォリオに掲載する写真をアップロードします。</p>
                        </div>
                    </Link>

                    <Link href="/dashboard/photos" className="block group">
                        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition border border-transparent hover:border-blue-500">
                            <div className="text-3xl mb-3">📂</div>
                            <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600">自分の写真を確認</h3>
                            <p className="text-gray-500 text-sm">これまでに投稿した写真の一覧を確認・一部削除できます。</p>
                        </div>
                    </Link>
                </div>
            </main>
        </div>
    );
}
