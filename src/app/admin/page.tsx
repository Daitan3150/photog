'use client';

import Link from 'next/link';
import { Home, Images, Aperture, Camera, UserPlus, Star, ShieldAlert, Settings, UserCircle, Globe, FileText } from 'lucide-react';
import { useAuth } from '@/components/admin/AuthProvider';

export default function AdminDashboard() {
    const { role } = useAuth();
    const isAdmin = role === 'admin';

    const tiles = [
        { href: '/admin/photos', title: '写真管理', icon: Images },
        { href: '/admin/management/gear', title: 'レンズ・カメラ管理', icon: Aperture },
        { href: '/admin/management/access', title: '招待・モデル管理', icon: UserPlus, adminOnly: true },
        { href: '/admin/studios', title: 'スタジオ管理', icon: Home },
        { href: '/admin/locations', title: 'ロケーション管理', icon: Globe },
        { href: '/admin/lenses', title: 'レンズ一覧', icon: Star },
        { href: '/admin/cameras', title: 'カメラ一覧', icon: Camera },
        { href: '/admin/requests', title: '削除依頼', icon: ShieldAlert, adminOnly: true },
        { href: '/admin/blog', title: 'ブログ管理', icon: FileText },
        { href: '/admin/settings/covers', title: 'サイト設定', icon: Settings, adminOnly: true },
        { href: '/admin/profile', title: 'プロフィール', icon: UserCircle },
    ];

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-black">管理画面ダッシュボード</h1>
                    <p className="text-sm text-slate-600 mt-2">ここから各管理セクションへアクセスできます。権限に応じて項目が表示されます。</p>
                </header>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {tiles.map((t) => {
                        if (t.adminOnly && !isAdmin) return null;
                        const Icon = t.icon as any;
                        return (
                            <Link key={t.href} href={t.href} className="group block p-4 rounded-lg border hover:shadow-lg transition-all bg-white border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-md p-2 bg-slate-50 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold">{t.title}</div>
                                        <div className="text-xs text-slate-400">{t.href}</div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
