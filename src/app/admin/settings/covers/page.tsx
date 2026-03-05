'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/admin/AuthProvider';
import { getSiteSettings, updateSiteSettings, SiteSettings } from '@/lib/actions/settings';
import { Camera, Save, RefreshCw, Layout, Image as ImageIcon, Check } from 'lucide-react';
import Image from 'next/image';
import cloudinaryLoader from '@/lib/cloudinary-loader';
import { searchPhotos } from '@/lib/actions/photos';
import { Photo } from '@/types/photo';

export default function CoverSettingsPage() {
    const { role } = useAuth();
    const isAdmin = role === 'admin';

    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [selectorTarget, setSelectorTarget] = useState<keyof SiteSettings['covers'] | null>(null);
    const [recentPhotos, setRecentPhotos] = useState<Photo[]>([]);
    const [photoLoading, setPhotoLoading] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            const data = await getSiteSettings();
            setSettings(data);
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        setMessage('');
        setError('');

        const result = await updateSiteSettings(settings);
        if (result.success) {
            setMessage('設定を保存しました。');
        } else {
            setError('エラーが発生しました: ' + (result.error || '不明なエラー'));
        }
        setSaving(false);
    };

    const openSelector = async (target: keyof SiteSettings['covers']) => {
        setSelectorTarget(target);
        setIsSelectorOpen(true);
        setPhotoLoading(true);
        const photos = await searchPhotos('', { limit: 40 });
        setRecentPhotos(photos as Photo[]);
        setPhotoLoading(false);
    };

    const selectPhoto = (url: string) => {
        if (!settings || !selectorTarget) return;
        setSettings({
            ...settings,
            covers: {
                ...settings.covers,
                [selectorTarget]: url
            }
        });
        setIsSelectorOpen(false);
        setSelectorTarget(null);
    };

    if (!isAdmin) return <div className="p-10 text-center">アクセス権限がありません。</div>;
    if (loading) return <div className="p-10 text-center">読み込み中...</div>;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <ImageIcon className="text-blue-600" /> カバー画像設定
                    </h1>
                    <p className="text-gray-500 mt-2">サイトの主要なセクションの背景画像を変更できます。</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 shadow-lg"
                >
                    {saving ? <RefreshCw className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                    設定を保存
                </button>
            </div>

            {message && <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl border border-green-200 font-bold flex items-center gap-2"><Check className="w-5 h-5" /> {message}</div>}
            {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 font-bold">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                {/* Home Portrait Cover */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Layout className="w-5 h-5 text-gray-400" />
                        <h2 className="font-bold text-gray-700">HOME: Portrait カバー</h2>
                    </div>
                    <div className="relative aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden mb-4 group">
                        {settings?.covers.home_portrait ? (
                            <Image
                                loader={cloudinaryLoader}
                                src={settings.covers.home_portrait}
                                alt="Portrait Cover"
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-300">No Image</div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                                onClick={() => openSelector('home_portrait')}
                                className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all"
                            >
                                画像を変更
                            </button>
                        </div>
                    </div>
                    <input
                        type="text"
                        value={settings?.covers.home_portrait || ''}
                        onChange={(e) => setSettings({ ...settings!, covers: { ...settings!.covers, home_portrait: e.target.value } })}
                        className="w-full border p-2 rounded text-xs bg-gray-50 outline-none"
                        placeholder="Cloudinary URL または画像パス"
                    />
                </div>

                {/* Home Snapshot Cover */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Layout className="w-5 h-5 text-gray-400" />
                        <h2 className="font-bold text-gray-700">HOME: Snapshot カバー</h2>
                    </div>
                    <div className="relative aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden mb-4 group">
                        {settings?.covers.home_snapshot ? (
                            <Image
                                loader={cloudinaryLoader}
                                src={settings.covers.home_snapshot}
                                alt="Snapshot Cover"
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-300">No Image</div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                                onClick={() => openSelector('home_snapshot')}
                                className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all"
                            >
                                画像を変更
                            </button>
                        </div>
                    </div>
                    <input
                        type="text"
                        value={settings?.covers.home_snapshot || ''}
                        onChange={(e) => setSettings({ ...settings!, covers: { ...settings!.covers, home_snapshot: e.target.value } })}
                        className="w-full border p-2 rounded text-xs bg-gray-50 outline-none"
                        placeholder="Cloudinary URL または画像パス"
                    />
                </div>

                {/* Admin Dashboard Cover */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm md:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <Camera className="w-5 h-5 text-gray-400" />
                        <h2 className="font-bold text-gray-700">管理画面 ダッシュボード背景</h2>
                    </div>
                    <div className="relative aspect-[21/9] bg-gray-100 rounded-xl overflow-hidden mb-4 group">
                        {settings?.covers.admin_dashboard ? (
                            <Image
                                loader={cloudinaryLoader}
                                src={settings.covers.admin_dashboard}
                                alt="Admin Cover"
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-300">No Image (Default used)</div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                                onClick={() => openSelector('admin_dashboard')}
                                className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all"
                            >
                                画像を変更
                            </button>
                        </div>
                    </div>
                    <input
                        type="text"
                        value={settings?.covers.admin_dashboard || ''}
                        onChange={(e) => setSettings({ ...settings!, covers: { ...settings!.covers, admin_dashboard: e.target.value } })}
                        className="w-full border p-2 rounded text-xs bg-gray-50 outline-none"
                        placeholder="Cloudinary URL"
                    />
                </div>
            </div>

            {/* Photo Selector Modal */}
            {isSelectorOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSelectorOpen(false)} />
                    <div className="relative bg-white w-full max-w-4xl max-h-[80vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b flex items-center justify-between">
                            <h3 className="text-xl font-black">画像を選択</h3>
                            <button onClick={() => setIsSelectorOpen(false)} className="text-gray-400 hover:text-black font-bold">閉じる</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {photoLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <RefreshCw className="animate-spin w-8 h-8 text-blue-500" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {recentPhotos.map((photo) => (
                                        <div
                                            key={photo.id}
                                            onClick={() => selectPhoto(photo.url)}
                                            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-4 hover:ring-blue-500 transition-all group"
                                        >
                                            <Image
                                                loader={cloudinaryLoader}
                                                src={photo.url}
                                                alt={photo.title}
                                                fill
                                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
