'use client';

import { useAuth } from '@/components/admin/AuthProvider';
import BackupEmailButton from '@/components/admin/BackupEmailButton';
import { Images, UserPlus, Users, UserCircle, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSiteSettings, SiteSettings } from '@/lib/actions/settings';

export default function AdminDashboard() {
    const { user, role } = useAuth();
    const isAdmin = role === 'admin';
    const [settings, setSettings] = useState<SiteSettings | null>(null);

    useEffect(() => {
        getSiteSettings().then(setSettings);
    }, []);

    return (
        <div className="animate-in fade-in duration-700">
            <h1 className={`text-4xl font-black mb-8 tracking-tighter ${isAdmin ? 'text-slate-800' : 'text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-indigo-400'}`}>
                {isAdmin ? 'スタジオ管理' : 'CREATIVE STUDIO'}
            </h1>

            <div className={`p-8 rounded-2xl shadow-xl transition-all duration-500 border overflow-hidden relative
                ${isAdmin ? 'bg-white border-gray-100' : 'bg-[#0f0c29] border-fuchsia-500/30'}`}
                style={isAdmin && settings?.covers.admin_dashboard ? {
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.9), rgba(255,255,255,0.9)), url(${settings.covers.admin_dashboard})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                } : {}}
            >
                {/* Background Decoration for Models */}
                {!isAdmin && (
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-fuchsia-600/10 rounded-full blur-3xl"></div>
                )}

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner
                            ${isAdmin ? 'bg-blue-50 text-blue-600' : 'bg-fuchsia-500/20 text-fuchsia-400'}`}
                        >
                            {isAdmin ? '👤' : <Sparkles className="w-8 h-8" />}
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${!isAdmin ? 'text-white' : 'text-gray-900'}`}>
                                Welcome back, <span className={isAdmin ? 'text-blue-600' : 'text-fuchsia-400'}>{user?.displayName || 'User'}</span>
                            </p>
                            <p className={isAdmin ? 'text-gray-500 font-medium' : 'text-fuchsia-400/60 font-medium'}>
                                {isAdmin ? 'DAITAN ポートフォリオの管理者権限でログイン中' : 'あなたのクリエイティブを世界へ。'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Photo Management Card */}
                        <div className={`p-6 rounded-xl border transition-all duration-300 group
                            ${isAdmin
                                ? 'bg-white border-gray-100 hover:border-blue-400 hover:shadow-lg shadow-gray-200'
                                : 'bg-white/5 border-fuchsia-500/20 hover:border-fuchsia-500/60 hover:bg-white/10 shadow-fuchsia-900/10'}`}
                        >
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 transition-transform group-hover:scale-110
                                ${isAdmin ? 'bg-blue-100 text-blue-600' : 'bg-fuchsia-600/20 text-fuchsia-400'}`}>
                                <Images size={24} />
                            </div>
                            <h3 className={`text-xl font-black mb-2 ${!isAdmin ? 'text-white' : 'text-gray-900'}`}>
                                {isAdmin ? '写真全管理' : 'MY GALLERY'}
                            </h3>
                            <p className={`text-sm mb-6 ${isAdmin ? 'text-gray-500' : 'text-fuchsia-100/60'}`}>
                                {isAdmin ? '全ての写真の管理と設定。' : 'アップロードした写真の管理と新規投稿。'}
                            </p>
                            <Link
                                href="/admin/photos"
                                className={`flex items-center justify-between p-3 rounded-lg font-bold text-sm transition-all
                                    ${isAdmin
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white hover:shadow-[0_0_15px_rgba(192,38,211,0.4)]'}`}
                            >
                                <span>写真を管理する</span>
                                <ArrowRight size={16} />
                            </Link>
                        </div>

                        {/* Exclusive Admin or Invite/Profile Section */}
                        {isAdmin ? (
                            <>
                                <div className="p-6 rounded-xl bg-white border border-gray-100 hover:border-pink-400 hover:shadow-lg shadow-gray-200 transition-all group">
                                    <div className="w-12 h-12 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                                        <UserPlus size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">招待管理</h3>
                                    <p className="text-gray-500 mb-6 text-sm">モデル用招待コードの発行と管理。</p>
                                    <Link href="/admin/invite" className="flex items-center justify-between p-3 bg-pink-500 text-white rounded-lg font-bold text-sm hover:bg-pink-600 transition-all">
                                        <span>招待コードを管理</span>
                                        <ArrowRight size={16} />
                                    </Link>
                                </div>
                                <div className="p-6 rounded-xl bg-white border border-gray-100 hover:border-indigo-400 hover:shadow-lg shadow-gray-200 transition-all group">
                                    <div className="w-12 h-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                                        <Users size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">ユーザー管理</h3>
                                    <p className="text-gray-500 mb-6 text-sm">登録ユーザーのリストと統計。</p>
                                    <Link href="/admin/users" className="flex items-center justify-between p-3 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all">
                                        <span>ユーザー一覧を見る</span>
                                        <ArrowRight size={16} />
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <div className="p-6 rounded-xl bg-white/5 border border-fuchsia-500/20 hover:border-fuchsia-500/60 hover:bg-white/10 transition-all group">
                                <div className="w-12 h-12 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                                    <UserCircle size={24} />
                                </div>
                                <h3 className="text-xl font-black mb-2 text-white">MY PROFILE</h3>
                                <p className="text-fuchsia-100/60 mb-6 text-sm">プロフィール情報の更新とSNS設定。</p>
                                <Link href="/admin/profile" className="flex items-center justify-between p-3 bg-white/10 text-white border border-white/20 rounded-lg font-bold text-sm hover:bg-white/20 transition-all uppercase tracking-widest">
                                    <span>EDIT PROFILE</span>
                                    <ArrowRight size={16} />
                                </Link>
                            </div>
                        )}

                        {isAdmin && <BackupEmailButton />}
                    </div>
                </div>
            </div>
        </div>
    );
}
