'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/admin/AuthProvider';
import { getSiteSettings, updateSiteSettings, SiteSettings } from '@/lib/actions/settings';
import { Camera, Save, RefreshCw, Layout, Image as ImageIcon, Check, Search, Zap } from 'lucide-react';
import Image from 'next/image';
import cloudinaryLoader from '@/lib/cloudinary-loader';
import { searchPhotos } from '@/lib/actions/photos';
import { rebuildAlgoliaIndex } from '@/lib/actions/algolia';
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
    const [selectorTarget, setSelectorTarget] = useState<keyof SiteSettings['covers'] | 'site_og_image' | null>(null);
    const [recentPhotos, setRecentPhotos] = useState<Photo[]>([]);
    const [photoLoading, setPhotoLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const openSelector = async (target: keyof SiteSettings['covers'] | 'site_og_image') => {
        setSelectorTarget(target);
        setIsSelectorOpen(true);
        setPhotoLoading(true);
        const photos = await searchPhotos('', { limit: 40 });
        setRecentPhotos(photos as Photo[]);
        setPhotoLoading(false);
    };

    const selectPhoto = (url: string) => {
        if (!settings || !selectorTarget) return;

        if (selectorTarget === 'site_og_image') {
            setSettings({
                ...settings,
                ogp: {
                    ...settings.ogp,
                    siteImage: url
                }
            });
        } else {
            setSettings({
                ...settings,
                covers: {
                    ...settings.covers,
                    [selectorTarget]: url
                }
            });
        }
        setIsSelectorOpen(false);
        setSelectorTarget(null);
    };

    const uploadExternalImage = async (file: File) => {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'profile_preset';

        if (!cloudName) {
            setUploadError('Cloudinary の設定が不足しています。');
            return;
        }

        setUploadingImage(true);
        setUploadError('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json() as { secure_url?: string };
            if (result?.secure_url) {
                selectPhoto(result.secure_url);
            } else {
                setUploadError('画像のアップロードに失敗しました。');
            }
        } catch (error) {
            console.error('External image upload failed', error);
            setUploadError('画像のアップロード中にエラーが発生しました。');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            uploadExternalImage(file);
        }
        event.target.value = '';
    };

    const handleRebuildAlgolia = async () => {
        if (!confirm('全ての写真データを検索エンジン(Algolia)へ再同期しますか？')) return;
        setSyncing(true);
        setMessage('');
        setError('');

        const result = await rebuildAlgoliaIndex();
        if (result.success) {
            setMessage(`検索インデックスの再構築が完了しました（${result.count}件）。`);
        } else {
            setError('同期エラー: ' + result.error);
        }
        setSyncing(false);
    };

    if (!isAdmin) return <div className="p-10 text-center">アクセス権限がありません。</div>;
    if (loading) return <div className="p-10 text-center">読み込み中...</div>;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <ImageIcon className="text-blue-600" /> サイト設定
                    </h1>
                    <p className="text-gray-500 mt-2">サイト全体で使うOGP画像や主要カバー画像をここから設定できます。</p>
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
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm md:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                        <h2 className="font-bold text-gray-700">サイト共通 OGP 画像</h2>
                    </div>
                    <div className="relative aspect-[1200/630] max-h-[320px] bg-gray-100 rounded-xl overflow-hidden mb-4 group border border-dashed border-blue-200">
                        {settings?.ogp?.siteImage ? (
                            <Image
                                loader={cloudinaryLoader}
                                src={settings.ogp.siteImage}
                                alt="Site OGP Image"
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6 text-center">
                                <p className="mb-2 text-sm font-semibold">サイト共通のOGP画像が未設定です</p>
                                <p className="text-xs">ここに設定すると、サイト全体のSNS共有時に使われます。</p>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                                onClick={() => openSelector('site_og_image')}
                                className="bg-white text-black px-5 py-3 rounded-2xl font-bold text-sm shadow-xl transform translate-y-3 group-hover:translate-y-0 transition-all"
                            >
                                画像を変更 / アップロード
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <p className="text-xs text-gray-600">この画像はサイト全体のOGP / X / LINE シェア時に使われます。</p>
                        <button
                            type="button"
                            onClick={() => openSelector('site_og_image')}
                            className="inline-flex items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 transition-all"
                        >
                            ファイルからOGP画像を設定する
                        </button>
                    </div>
                </div>
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

            {/* Algolia Sync Section */}
            <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white flex-shrink-0">
                                <Search className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900">検索エンジンの同期</h2>
                                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                    写真が表示されない場合や、モデル名での検索がおかしい場合は、<br />
                                    データベース内の全写真を検索エンジン（Algolia）へ再同期してください。
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleRebuildAlgolia}
                            disabled={syncing}
                            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 min-w-[200px] disabled:opacity-50"
                        >
                            {syncing ? (
                                <RefreshCw className="animate-spin w-5 h-5" />
                            ) : (
                                <Zap className="w-5 h-5" />
                            )}
                            {syncing ? '同期中...' : 'インデックス再構築'}
                        </button>
                    </div>
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
                            <div className="mb-6 rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <ImageIcon className="w-5 h-5 text-blue-600" />
                                    <h4 className="font-bold text-gray-800">外部画像を選択</h4>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">投稿済み写真ではなく、PC上の画像ファイルをそのまま選択して OGP 画像にできます。</p>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingImage}
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-all disabled:opacity-50"
                                >
                                    {uploadingImage ? <RefreshCw className="animate-spin w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                                    {uploadingImage ? 'アップロード中...' : '画像ファイルを選択'}
                                </button>
                                {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
                            </div>

                            {photoLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <RefreshCw className="animate-spin w-8 h-8 text-blue-500" />
                                </div>
                            ) : (
                                <div>
                                    <div className="mb-3 text-sm font-semibold text-gray-700">または投稿済み写真から選ぶ</div>
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
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
