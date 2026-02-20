'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getPhotoById, updatePhoto, requestExifData, getExifSuggestions } from '@/lib/actions/photos';
import Image from 'next/image';
import { Camera, ChevronLeft, Save, ArrowLeft } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function EditPhotoPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: photoId } = use(params);
    const [title, setTitle] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [displayMode, setDisplayMode] = useState<'title' | 'character'>('title');
    const [exif, setExif] = useState<any>(null);
    const [exifRequest, setExifRequest] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [replacing, setReplacing] = useState(false);
    const [exifSuggestions, setExifSuggestions] = useState<{ models: string[], lensModels: string[] }>({ models: [], lensModels: [] });
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push('/admin/login');
                return;
            }

            try {
                const token = await user.getIdToken();
                const data = await getPhotoById(photoId, token);

                if (data) {
                    // Security check: Ensure user is owner (getPhotoById already checks, but double check)
                    if (data.uploaderId !== user.uid) {
                        alert('この写真を編集する権限がありません。');
                        router.push('/dashboard/photos');
                        return;
                    }
                    setTitle(data.title || '');
                    setImageUrl(data.url);
                    setDisplayMode(data.displayMode || 'title');
                    setExif(data.exif || null);
                    setExifRequest(data.exifRequest || false);
                    setTags(data.tags || []);
                } else {
                    alert('写真が見つかりません、またはアクセス権限がありません。');
                    router.push('/dashboard/photos');
                }
            } catch (error) {
                console.error("Error fetching photo:", error);
            } finally {
                setLoading(false);
            }

            // Fetch suggestions
            getExifSuggestions().then(res => {
                if (res.success && res.data) setExifSuggestions(res.data);
            });
        });
        return () => unsubscribe();
    }, [photoId, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('No token found');
            const result = await updatePhoto(photoId, { title, displayMode, tags }, token);
            if (result.success) {
                alert('更新しました！');
                router.push('/dashboard/photos');
            } else {
                alert('更新に失敗しました: ' + result.error);
            }
        } catch (error) {
            console.error('Error updating photo:', error);
            alert('更新に失敗しました。');
        }
        setSaving(false);
    };

    const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const user = auth.currentUser;
        if (!file || !user) return;

        setReplacing(true);
        try {
            let result: any;

            // [ENHANCED] Support for large files (>3MB) during replacement
            if (file.size > 3 * 1024 * 1024) {
                const fileName = `${Date.now()}_${file.name}`;
                const storagePath = `temp_uploads/${user.uid}/${fileName}`;
                const storageRef = ref(storage, storagePath);

                await uploadBytes(storageRef, file);
                const downloadUrl = await getDownloadURL(storageRef);

                const processResponse = await fetch('/api/upload/resize-remote', {
                    method: 'POST',
                    body: JSON.stringify({
                        url: downloadUrl,
                        publicId: storagePath,
                        fileName: file.name
                    })
                });

                if (!processResponse.ok) throw new Error('Server processing failed');
                result = await processResponse.json();
            } else {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/upload/resize', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error('Upload failed');
                result = await response.json();
            }

            setImageUrl(result.url);
            setExif(result.exif || exif);
            setTags(result.tags || tags);

        } catch (err: any) {
            alert('アップロードに失敗しました: ' + err.message);
        } finally {
            setReplacing(false);
        }
    };

    const handleRequestExif = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('No token found');
            const result = await requestExifData(photoId, token);
            if (result.success) {
                alert('機材情報の登録を管理者に依頼しました');
                setExifRequest(true);
            } else {
                alert('依頼に失敗しました: ' + result.error);
            }
        } catch (error) {
            console.error('Error requesting EXIF:', error);
            alert('依頼に失敗しました。');
        }
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="max-w-xl mx-auto py-10 px-4">
            <h1 className="text-2xl font-bold mb-6">写真を編集</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
                {/* Image Preview (Read-only for now to keep it simple) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">写真</label>
                    <div className="relative aspect-[2/3] w-full max-w-xs mx-auto">
                        <Image
                            src={imageUrl}
                            alt="Preview"
                            fill
                            className={`object-cover rounded ${replacing ? 'opacity-50' : ''}`}
                        />
                        {replacing && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>

                    <div className="mt-4">
                        <input
                            id="replace-photo"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileSelection}
                            disabled={replacing || saving}
                        />
                        <label
                            htmlFor="replace-photo"
                            className="flex items-center justify-center gap-2 w-full bg-white border border-gray-200 rounded-lg py-2 px-4 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
                        >
                            <Save size={14} />
                            {replacing ? 'アップロード中...' : '写真を差し替える'}
                        </label>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center mt-2">※写真は差し替え可能です</p>

                    {/* [NEW] EXIF Request Section */}
                    {!exif && !exifRequest && (
                        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex flex-col items-center gap-3">
                            <p className="text-[10px] text-blue-600 font-bold text-center">
                                写真に機材情報（EXIF）が設定されていません。<br />
                                管理者に登録を依頼しますか？
                            </p>
                            <button
                                type="button"
                                onClick={handleRequestExif}
                                className="flex items-center gap-2 bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all shadow-sm"
                            >
                                <Camera className="w-3.5 h-3.5" />
                                管理者に機材情報を依頼する
                            </button>
                        </div>
                    )}

                    {exifRequest && !exif && (
                        <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-xl text-center">
                            <p className="text-[10px] text-orange-600 font-bold whitespace-nowrap">
                                🔒 機材情報の登録を依頼中です
                            </p>
                        </div>
                    )}

                    {exif && (
                        <div className="mt-6 p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-4">
                            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Shooting Gear</p>

                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <p className="text-[10px] text-gray-400 mb-1">カメラ</p>
                                    <input
                                        type="text"
                                        list="dashboard-camera-candidates"
                                        value={exif.Model || ''}
                                        onChange={(e) => setExif({ ...exif, Model: e.target.value })}
                                        className="w-full border-gray-200 border bg-white rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-300"
                                    />
                                    <datalist id="dashboard-camera-candidates">
                                        {exifSuggestions.models.map((m, i) => <option key={i} value={m} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 mb-1">レンズ</p>
                                    <input
                                        type="text"
                                        list="dashboard-lens-candidates"
                                        value={exif.LensModel || ''}
                                        onChange={(e) => setExif({ ...exif, LensModel: e.target.value })}
                                        className="w-full border-gray-200 border bg-white rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-300"
                                    />
                                    <datalist id="dashboard-lens-candidates">
                                        {exifSuggestions.lensModels.map((l, i) => <option key={l} value={l} />)}
                                    </datalist>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Display Mode Selection */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2">表示モードの選択 (A または B)</label>
                    <div className="flex gap-4">
                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${displayMode === 'title' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                            <input
                                type="radio"
                                name="displayMode"
                                value="title"
                                checked={displayMode === 'title'}
                                onChange={() => setDisplayMode('title')}
                                className="hidden"
                            />
                            <span className="font-bold text-sm">A: タイトルを表示</span>
                        </label>
                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${displayMode === 'character' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                            <input
                                type="radio"
                                name="displayMode"
                                value="character"
                                checked={displayMode === 'character'}
                                onChange={() => setDisplayMode('character')}
                                className="hidden"
                            />
                            <span className="font-bold text-sm">B: キャラクター名を表示</span>
                        </label>
                    </div>
                </div>

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                    <input
                        type="text"
                        value={title}
                    />
                </div>

                {/* Tags Section */}
                <div className="pt-4 space-y-3 border-t border-gray-100">
                    <label className="block text-sm font-bold text-gray-700">タグ (AI・手動追加)</label>
                    <div className="flex flex-wrap gap-2">
                        {tags.map((tag, idx) => (
                            <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-medium border border-blue-100">
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                                    className="ml-1.5 hover:text-blue-800"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                        <input
                            type="text"
                            placeholder="タグ追加..."
                            className="inline-flex px-2 py-0.5 rounded-full bg-gray-50 text-[11px] border border-gray-200 outline-none focus:ring-1 focus:ring-blue-300 w-20"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const value = (e.target as HTMLInputElement).value.trim();
                                    if (value && !tags.includes(value)) {
                                        setTags([...tags, value]);
                                        (e.target as HTMLInputElement).value = '';
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex-1 bg-gray-200 text-gray-800 py-3 rounded font-bold hover:bg-gray-300 transition"
                    >
                        キャンセル
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {saving ? '保存中...' : '保存する'}
                    </button>
                </div>
            </form>
        </div>
    );
}
