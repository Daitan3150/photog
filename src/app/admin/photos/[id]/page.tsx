'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/admin/AuthProvider';
import { getPhotoById, updatePhoto, getExifSuggestions, refreshPhotoMetadata } from '@/lib/actions/photos';
import { getCategories, Category } from '@/lib/actions/categories';
import { getSubjects, Subject } from '@/lib/actions/subjects';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Save, Calendar, User, MapPin, Tag, Link2 } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import exifr from 'exifr';

// ✅ 署名取得
const fetchSignature = async (params: Record<string, any>, token: string) => {
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
    const res = await fetch(`${workerUrl}/api/sign-upload`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ params })
    });
    if (!res.ok) throw new Error('Signature fetch failed');
    return await res.json() as { signature: string; timestamp: number; apiKey: string };
};

// ✅ XHRアップロード
function xhrUpload(
    url: string,
    formData: FormData,
    onProgress: (pct: number) => void
): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText));
            } else {
                try {
                    const err = JSON.parse(xhr.responseText);
                    reject(new Error(err?.error?.message || 'Upload failed'));
                } catch {
                    reject(new Error('Upload failed with status ' + xhr.status));
                }
            }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
    });
}


export default function AdminEditPhotoPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: photoId } = use(params);
    const { user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [formData, setFormData] = useState({
        title: '',
        subjectName: '',
        characterName: '',
        location: '',
        shotAt: '',
        snsUrl: '',
        categoryId: '',
        displayMode: 'title' as 'title' | 'character',
        url: '',
        publicId: '',
        exif: {} as any,
        exifRequest: false,
        tags: [] as string[],
        focalPoint: undefined as { x: number, y: number } | undefined
    });
    const [categories, setCategories] = useState<Category[]>([]);
    const [originalPhoto, setOriginalPhoto] = useState<any>(null);
    const [replacing, setReplacing] = useState(false);
    const [shotAtEnabled, setShotAtEnabled] = useState(true); // false = 撮影日なし
    const [exifSuggestions, setExifSuggestions] = useState<{ models: string[], lensModels: string[] }>({ models: [], lensModels: [] });
    const [refreshingExif, setRefreshingExif] = useState(false);

    useEffect(() => {
        if (user) {
            fetchPhoto();
            getCategories().then(res => {
                if (res.success) setCategories(res.data);
            });
            getSubjects().then(res => {
                if (res.success) setSubjects(res.data);
            });
            getExifSuggestions().then(res => {
                if (res.success && res.data) setExifSuggestions(res.data);
            });
        }
    }, [user, photoId]);

    const fetchPhoto = async () => {
        if (!user) return;
        const token = await user.getIdToken();
        const data = await getPhotoById(photoId, token);
        if (data) {
            setOriginalPhoto(data);
            const hasShotAt = !!data.shotAt;
            setShotAtEnabled(hasShotAt);
            setFormData({
                title: data.title || '',
                subjectName: data.subjectName || '',
                characterName: data.characterName || '',
                location: data.location || '',
                shotAt: data.shotAt ? data.shotAt.split('T')[0] : '',
                snsUrl: data.snsUrl || '',
                categoryId: data.categoryId || 'Works',
                displayMode: data.displayMode || 'title',
                url: data.url,
                publicId: data.publicId,
                exif: data.exif || {},
                exifRequest: data.exifRequest || false,
                tags: data.tags || [],
                focalPoint: data.focalPoint || undefined
            });
        }
        setLoading(false);
    };



    const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setReplacing(true);
        try {
            const { resizeImageClient } = await import('@/lib/utils/client-image');
            const token = await user.getIdToken();

            // 1. Client-side EXIF Parsing
            let clientExif: any = {};
            try {
                clientExif = await exifr.parse(file, {
                    tiff: true,
                    xmp: true,
                    exif: true,
                    gps: true,
                });
            } catch (e) {
                console.warn('EXIF parse failed:', e);
            }

            // 2. Client-side Resize
            let fileToUpload: File | Blob = file;
            try {
                // Resize to max 2500px, quality 0.85
                fileToUpload = await resizeImageClient(file, 2500, 2500, 0.85);
            } catch { /* Fallback to original */ }

            // 3. Prepare Signed Upload
            const timestamp = Math.round(new Date().getTime() / 1000);
            const uploadParams: Record<string, any> = {
                timestamp,
                folder: 'portfolio',
                upload_preset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'next-portfolio',
                auto_tagging: '0.6' // Enable AI tagging
            };

            const { signature, apiKey } = await fetchSignature(uploadParams, token);

            const formDataUpload = new FormData();
            formDataUpload.append('file', fileToUpload);
            formDataUpload.append('signature', signature);
            formDataUpload.append('api_key', apiKey);
            formDataUpload.append('timestamp', String(timestamp));
            Object.entries(uploadParams).forEach(([key, value]) => {
                if (key !== 'timestamp') formDataUpload.append(key, String(value));
            });

            // 4. Upload with Progress (could add progress state if needed, mostly fast for one photo)
            const result: any = await xhrUpload(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
                formDataUpload,
                (pct) => { /* console.log(pct) */ }
            );

            // 5. Merge EXIF & Update Form
            const mergedExif = { ...clientExif, ...(result.exif || {}) };

            setFormData(prev => {
                const newData = {
                    ...prev,
                    url: result.secure_url,
                    publicId: result.public_id,
                    exif: { ...prev.exif, ...mergedExif },
                    tags: [...new Set([...prev.tags, ...(result.tags || [])])]
                };

                // Auto-fill form fields from new EXIF (Since this is single edit, we WANT to overwrite)
                if (mergedExif.Model) newData.exif.Model = mergedExif.Model;
                if (mergedExif.LensModel) newData.exif.LensModel = mergedExif.LensModel;
                if (mergedExif.FNumber) newData.exif.FNumber = mergedExif.FNumber;
                if (mergedExif.ExposureTime) newData.exif.ExposureTime = mergedExif.ExposureTime;
                if (mergedExif.ISOSpeedRatings || mergedExif.ISO) newData.exif.ISO = mergedExif.ISOSpeedRatings || mergedExif.ISO;

                // Update shotAt if available
                const rawDate = mergedExif.DateTimeOriginal || mergedExif.DateTime;
                if (rawDate) {
                    try {
                        const d = new Date(rawDate);
                        if (!isNaN(d.getTime())) {
                            newData.shotAt = d.toISOString().split('T')[0];
                        }
                    } catch { }
                }

                return newData;
            });

            // Update Preview
            setOriginalPhoto((prev: any) => ({
                ...prev,
                url: result.secure_url,
                publicId: result.public_id
            }));

            alert('写真を差し替えました。保存ボタンで確定してください。');

        } catch (err: any) {
            console.error('Replacement failed:', err);
            alert('アップロードに失敗しました: ' + err.message);
        } finally {
            setReplacing(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        const token = await user.getIdToken();
        const result = await updatePhoto(photoId, {
            ...formData,
            shotAt: shotAtEnabled ? formData.shotAt : '' // 撮影日なしの場合は空文字列
        }, token);

        if (result.success) {
            alert('写真を更新しました');
            router.push('/admin/photos');
        } else {
            alert('更新に失敗しました: ' + result.error);
        }
        setSaving(false);
    };

    const handleRefreshExif = async () => {
        if (!user || !photoId) return;
        if (!confirm('CloudinaryからEXIF情報を再取得し、現在の入力内容を上書きしますか？')) return;

        setRefreshingExif(true);
        try {
            const token = await user.getIdToken();
            const result = await refreshPhotoMetadata(photoId, token);
            if (result.success) {
                await fetchPhoto(); // Reload data

                // [DEBUG] Show what was found
                const debugInfo = result.debug ?
                    `\n\n[Debug Info]\nPublic ID: ${result.debug.publicId}\nModel: ${result.debug.foundModel}\nLens: ${result.debug.foundLens}` : '';

                alert('EXIF情報を更新しました' + debugInfo);
            } else {
                alert('EXIF更新に失敗しました: ' + result.error);
            }
        } catch (error: any) {
            alert('エラーが発生しました: ' + error.message);
        } finally {
            setRefreshingExif(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>;
    if (!originalPhoto) return <div className="p-20 text-center">写真が見つかりません。</div>;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <Link href="/admin/photos" className="inline-flex items-center text-gray-500 hover:text-gray-800 mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                写真一覧へ戻る
            </Link>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Left: Preview */}
                    <div className="bg-gray-50 p-6 flex flex-col justify-center items-center">
                        <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden shadow-2xl bg-gray-200">
                            {replacing && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 text-white font-bold">
                                    アップロード中...
                                </div>
                            )}
                            <Image
                                src={formData.url || originalPhoto.url}
                                alt={formData.title}
                                fill
                                className="object-cover"
                            />
                        </div>

                        <div className="mt-6 w-full">
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
                                className="flex items-center justify-center gap-2 w-full bg-white border-2 border-dashed border-gray-300 rounded-xl py-3 px-4 text-sm font-bold text-gray-600 hover:border-blue-400 hover:text-blue-500 transition-all cursor-pointer"
                            >
                                <Save className="w-4 h-4" />
                                {replacing ? '処理中...' : '写真を差し替える'}
                            </label>
                            <p className="text-[10px] text-gray-400 mt-2 text-center text-balance">
                                ※ 新しい画像を選ぶと前の画像は自動削除されます
                            </p>
                        </div>

                        <div className="text-center text-xs text-gray-400 mt-6 font-mono space-y-1">
                            <p>ID: {photoId}</p>
                            {originalPhoto.createdAt && (
                                <p>追加日: {new Date(originalPhoto.createdAt).toLocaleDateString('ja-JP')}</p>
                            )}
                            {originalPhoto.updatedAt && (
                                <p>更新日: {new Date(originalPhoto.updatedAt).toLocaleDateString('ja-JP')}</p>
                            )}
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className="p-8">
                        <h1 className="text-2xl font-bold mb-6 text-gray-900">詳細設定の編集</h1>

                        <form onSubmit={handleSave} className="space-y-5">
                            <div>
                                <label className="flex items-center text-sm font-bold text-gray-700 mb-1.5">
                                    <Tag className="w-4 h-4 mr-2 text-blue-500" />
                                    タイトル
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full border-gray-200 border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <label className="block text-sm font-bold text-gray-700 mb-2">表示モードの選択 (A または B)</label>
                                <div className="flex gap-4">
                                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.displayMode === 'character' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                                        <input
                                            type="radio"
                                            name="displayMode"
                                            value="character"
                                            checked={formData.displayMode === 'character'}
                                            onChange={() => setFormData({ ...formData, displayMode: 'character' })}
                                            className="hidden"
                                        />
                                        <span className="font-bold text-sm">B: キャラクター名を表示</span>
                                    </label>
                                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.displayMode === 'title' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                                        <input
                                            type="radio"
                                            name="displayMode"
                                            value="title"
                                            checked={formData.displayMode === 'title'}
                                            onChange={() => setFormData({ ...formData, displayMode: 'title' })}
                                            className="hidden"
                                        />
                                        <span className="font-bold text-sm">A: タイトルを表示</span>
                                    </label>
                                </div>
                                <p className="text-[10px] text-gray-400">※ 写真オーバーレイに表示する項目を選択します。</p>
                            </div>

                            <div>
                                <label className="flex items-center text-sm font-bold text-gray-700 mb-1.5">
                                    <Tag className="w-4 h-4 mr-2 text-blue-500" />
                                    カテゴリー
                                </label>
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    className="w-full border-gray-200 border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="">未設定 (公開されません)</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="flex items-center text-sm font-bold text-gray-700 mb-1.5">
                                    <User className="w-4 h-4 mr-2 text-pink-500" />
                                    被写体名 / モデル名
                                </label>
                                <input
                                    type="text"
                                    list="subject-candidates"
                                    value={formData.subjectName}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        setFormData({ ...formData, subjectName: newValue });
                                        // Auto-populate SNS URL if exact match
                                        const matchedSubject = subjects.find(s => s.name === newValue);
                                        if (matchedSubject?.snsUrl) {
                                            setFormData(prev => ({ ...prev, snsUrl: matchedSubject.snsUrl || prev.snsUrl }));
                                        }
                                    }}
                                    className="w-full border-gray-200 border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <datalist id="subject-candidates">
                                    {subjects.map((s) => (
                                        <option key={s.id} value={s.name} />
                                    ))}
                                </datalist>
                            </div>

                            <div>
                                <label className="flex items-center text-sm font-bold text-gray-700 mb-1.5">
                                    <User className="w-4 h-4 mr-2 text-indigo-500" />
                                    キャラクター名 (任意)
                                </label>
                                <input
                                    type="text"
                                    value={formData.characterName}
                                    onChange={(e) => setFormData({ ...formData, characterName: e.target.value })}
                                    className="w-full border-gray-200 border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="例: 博麗霊夢 (東方Project)"
                                />
                            </div>

                            <div>
                                <label className="flex items-center text-sm font-bold text-gray-700 mb-1.5">
                                    <MapPin className="w-4 h-4 mr-2 text-green-500" />
                                    撮影場所
                                </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full border-gray-200 border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="flex items-center text-sm font-bold text-gray-700 mb-1.5">
                                    <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                                    撮影日
                                </label>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs text-gray-400">日付を指定</span>
                                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!shotAtEnabled}
                                            onChange={(e) => setShotAtEnabled(!e.target.checked)}
                                            className="rounded"
                                        />
                                        撮影日なし
                                    </label>
                                </div>
                                <input
                                    type="date"
                                    value={formData.shotAt}
                                    onChange={(e) => setFormData({ ...formData, shotAt: e.target.value })}
                                    disabled={!shotAtEnabled}
                                    className="w-full border-gray-200 border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                                />
                            </div>

                            <div>
                                <label className="flex items-center text-sm font-bold text-gray-700 mb-1.5">
                                    <Link2 className="w-4 h-4 mr-2 text-purple-500" />
                                    SNSリンク (URL or ID)
                                </label>
                                <input
                                    type="text"
                                    value={formData.snsUrl}
                                    onChange={(e) => setFormData({ ...formData, snsUrl: e.target.value })}
                                    className="w-full border-gray-200 border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="@username または URL"
                                />
                            </div>

                            {/* [NEW] EXIF Manual Entry Section */}
                            <div className="pt-4 space-y-4 border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center text-sm font-bold text-gray-700">
                                        <ArrowLeft className="w-4 h-4 mr-2 text-gray-400 rotate-90" />
                                        機材・撮影情報 (EXIF)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleRefreshExif}
                                            disabled={refreshingExif}
                                            className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 font-bold border border-gray-200 flex items-center gap-1"
                                        >
                                            {refreshingExif ? (
                                                <span className="animate-spin text-gray-400">⚡</span>
                                            ) : '↻'}
                                            {refreshingExif ? '取得中...' : '再取得'}
                                        </button>
                                        {originalPhoto.exifRequest && (
                                            <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                                                依頼あり
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-gray-400 mb-1">カメラ</p>
                                        <input
                                            type="text"
                                            list="camera-candidates"
                                            value={formData.exif?.Model || ''}
                                            onChange={(e) => setFormData({ ...formData, exif: { ...formData.exif, Model: e.target.value } })}
                                            className="w-full border-gray-100 border bg-gray-50/50 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-300"
                                            placeholder="例: Sony ILCE-7RM4"
                                        />
                                        <datalist id="camera-candidates">
                                            {exifSuggestions.models.map((m, i) => <option key={i} value={m} />)}
                                        </datalist>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-gray-400 mb-1">レンズ</p>
                                        <input
                                            type="text"
                                            list="lens-candidates"
                                            value={formData.exif?.LensModel || ''}
                                            onChange={(e) => setFormData({ ...formData, exif: { ...formData.exif, LensModel: e.target.value } })}
                                            className="w-full border-gray-100 border bg-gray-50/50 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-300"
                                            placeholder="例: FE 35mm F1.4 GM"
                                        />
                                        <datalist id="lens-candidates">
                                            {exifSuggestions.lensModels.map((l, i) => <option key={i} value={l} />)}
                                        </datalist>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 mb-1">絞り値 (F)</p>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.exif?.FNumber || ''}
                                            onChange={(e) => setFormData({ ...formData, exif: { ...formData.exif, FNumber: parseFloat(e.target.value) } })}
                                            className="w-full border-gray-100 border bg-gray-50/50 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-300"
                                            placeholder="1.4"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 mb-1">SS (秒)</p>
                                        <input
                                            type="text"
                                            value={formData.exif?.ExposureTime || ''}
                                            onChange={(e) => setFormData({ ...formData, exif: { ...formData.exif, ExposureTime: parseFloat(e.target.value) } })}
                                            className="w-full border-gray-100 border bg-gray-50/50 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-300"
                                            placeholder="0.005"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 mb-1">ISO</p>
                                        <input
                                            type="number"
                                            value={formData.exif?.ISO || ''}
                                            onChange={(e) => setFormData({ ...formData, exif: { ...formData.exif, ISO: parseInt(e.target.value) } })}
                                            className="w-full border-gray-100 border bg-gray-50/50 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-300"
                                            placeholder="100"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 mb-1">焦点距離 (mm)</p>
                                        <input
                                            type="number"
                                            value={formData.exif?.FocalLength || ''}
                                            onChange={(e) => setFormData({ ...formData, exif: { ...formData.exif, FocalLength: parseInt(e.target.value) } })}
                                            className="w-full border-gray-100 border bg-gray-50/50 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-300"
                                            placeholder="35"
                                        />
                                    </div>
                                </div>
                                {originalPhoto.exifRequest && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, exifRequest: false })}
                                        className="w-full py-1 text-[10px] text-gray-400 border border-gray-100 rounded hover:bg-gray-50"
                                    >
                                        完了済みとして依頼を解除
                                    </button>
                                )}
                            </div>

                            {/* Tags Section */}
                            <div className="pt-4 space-y-4 border-t border-gray-100">
                                <label className="flex items-center text-sm font-bold text-gray-700">
                                    <Tag className="w-4 h-4 mr-2 text-blue-500" />
                                    タグ (AI抽出・手動)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {formData.tags.map((tag, idx) => (
                                        <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium border border-blue-100">
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, tags: formData.tags.filter((_, i) => i !== idx) })}
                                                className="ml-2 hover:text-blue-800"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        type="text"
                                        placeholder="タグを追加..."
                                        className="inline-flex px-3 py-1 rounded-full bg-gray-50 text-xs border border-gray-200 outline-none focus:ring-1 focus:ring-blue-300 w-24"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const value = (e.target as HTMLInputElement).value.trim();
                                                if (value && !formData.tags.includes(value)) {
                                                    setFormData({ ...formData, tags: [...formData.tags, value] });
                                                    (e.target as HTMLInputElement).value = '';
                                                }
                                            }
                                        }}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 italic">※ AIが自動でタグを抽出していますが、手動で修正・追加も可能です。</p>
                            </div>

                            {/* [NEW] Focal Point Selection UI */}
                            <div className="pt-4 space-y-4 border-t border-gray-100">
                                <label className="flex items-center text-sm font-bold text-gray-700">
                                    <ArrowLeft className="w-4 h-4 mr-2 text-blue-500 rotate-180" />
                                    共有バナーの切り抜き位置 (Focal Point)
                                </label>
                                <div
                                    className="relative aspect-[1.91/1] w-full bg-gray-100 rounded-xl overflow-hidden cursor-crosshair group shadow-inner border border-gray-100"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                        const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                                        setFormData(prev => ({ ...prev, focalPoint: { x, y } }));
                                    }}
                                >
                                    <Image
                                        src={formData.url || originalPhoto.url}
                                        alt="Banner Preview"
                                        fill
                                        className="object-cover transition-all duration-500"
                                        style={{
                                            objectPosition: formData.focalPoint ? `${formData.focalPoint.x}% ${formData.focalPoint.y}%` : 'center',
                                            transform: 'scale(1.05)'
                                        }}
                                    />
                                    {formData.focalPoint && (
                                        <div
                                            className="absolute w-6 h-6 -ml-3 -mt-3 border-2 border-white rounded-full shadow-lg flex items-center justify-center pointer-events-none transition-all duration-300"
                                            style={{ left: `${formData.focalPoint.x}%`, top: `${formData.focalPoint.y}%` }}
                                        >
                                            <div className="w-1 h-1 bg-white rounded-full" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <p className="text-white text-[10px] font-bold tracking-widest uppercase bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                            Click to set banner focus
                                        </p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 italic">
                                    ※ プレビュー画像をクリックして、SNS共有時に中心となる位置（顔など）を設定してください。
                                </p>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-all font-sans"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-5 h-5" />
                                    {saving ? '保存中...' : '変更を保存'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
