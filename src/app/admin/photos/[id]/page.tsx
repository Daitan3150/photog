'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/admin/AuthProvider';
import { getPhotoById, updatePhoto, getExifSuggestions, refreshPhotoMetadata, getCoordinatesAction } from '@/lib/actions/photos';
import { getCategories, Category } from '@/lib/actions/categories';
import { getSubjects, Subject } from '@/lib/actions/subjects';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Save, Calendar, User, MapPin, Tag, Link2 } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import exifr from 'exifr';
import { formatShutterSpeed, validateShutterSpeed, STANDARD_APERTURES, getMinApertureFromLens } from '@/lib/utils/exif';
import SmartDatePicker from '@/components/admin/SmartDatePicker';
import LeafletMap from '@/components/common/LeafletMap';
import { motion, AnimatePresence } from 'framer-motion';

// ✅ 署名取得
const fetchSignature = async (paramsToSign: Record<string, any>, token: string) => {
    const res = await fetch(`/api/upload/sign`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ paramsToSign })
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
        address: '', // [NEW] Formal address
        shotAt: '',
        snsUrl: '',
        categoryId: '',
        event: '',
        displayMode: 'title' as 'title' | 'character',
        url: '',
        publicId: '',
        exif: {} as any,
        exifRequest: false,
        tags: [] as string[],
        focalPoint: undefined as { x: number, y: number } | undefined,
        latitude: null as number | null,
        longitude: null as number | null,
        addressZip: '',
        addressPref: '',
        addressCity: '',
        coordsInput: ''
    });
    const [categories, setCategories] = useState<Category[]>([]);
    const [originalPhoto, setOriginalPhoto] = useState<any>(null);
    const [replacing, setReplacing] = useState(false);
    const [shotAtEnabled, setShotAtEnabled] = useState(true); // false = 撮影日なし
    const [exifSuggestions, setExifSuggestions] = useState<{ models: string[], lensModels: string[] }>({ models: [], lensModels: [] });
    const [refreshingExif, setRefreshingExif] = useState(false);
    const [searchingLocation, setSearchingLocation] = useState(false);
    const [locationCandidates, setLocationCandidates] = useState<any[]>([]);
    const [showLocationConfirm, setShowLocationConfirm] = useState(false);
    const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);

    // ✅ Coords Auto-parsing from input string
    useEffect(() => {
        if (!formData.coordsInput) return;
        const parts = formData.coordsInput.split(/[,，]/);
        if (parts.length >= 2) {
            const parseCoord = (s: string, negChar: string) => {
                const num = parseFloat(s.replace(/[^\d.-]/g, ''));
                return s.includes(negChar) ? -Math.abs(num) : num;
            };
            const la = parseCoord(parts[0], '南');
            const ln = parseCoord(parts[1], '西');
            if (!isNaN(la) && !isNaN(ln) && (la !== formData.latitude || ln !== formData.longitude)) {
                setFormData(prev => ({ ...prev, latitude: la, longitude: ln }));
            }
        }
    }, [formData.coordsInput, formData.latitude, formData.longitude]);

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
                event: data.event || '',
                displayMode: data.displayMode || 'title',
                url: data.url,
                publicId: data.publicId,
                exif: {
                    ...data.exif,
                    // ✅ 初期表示時にシャッタースピードを分数形式に変換
                    ExposureTime: data.exif?.ExposureTime ? formatShutterSpeed(data.exif.ExposureTime) : ''
                },
                exifRequest: data.exifRequest || false,
                tags: data.tags || [],
                focalPoint: data.focalPoint || undefined,
                latitude: data.latitude || null,
                longitude: data.longitude || null,
                address: data.address || '',
                coordsInput: (data.latitude && data.longitude) ? `${data.latitude}, ${data.longitude}` : '',
                addressZip: (data as any).addressZip || '',
                addressPref: (data as any).addressPref || '',
                addressCity: (data as any).addressCity || ''
            });
        }
        setLoading(false);

        // ✅ Debug: Check raw data from server
        console.log(`[Admin EditPage] Fetched Data for ID ${photoId}:`, {
            rawLat: data.latitude,
            rawLng: data.longitude,
            typeLat: typeof data.latitude,
            typeLng: typeof data.longitude
        });
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
                // ✅ 写真差し替え時も分数形式に変換
                if (mergedExif.ExposureTime) newData.exif.ExposureTime = formatShutterSpeed(mergedExif.ExposureTime);
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

        // ✅ ロケーションの変更をチェック
        const isCoordChanged = (formData.latitude !== originalPhoto?.latitude || formData.longitude !== originalPhoto?.longitude);
        const isAddrChanged = (formData.address !== (originalPhoto as any)?.address || formData.addressZip !== (originalPhoto as any)?.addressZip);
        const hasLocationInfo = formData.latitude && formData.longitude;

        if ((isCoordChanged || isAddrChanged) && hasLocationInfo && !isLocationConfirmed) {
            setShowLocationConfirm(true);
            return;
        }

        // ✅ バリデーション
        const shutter = formData.exif?.ExposureTime;
        if (shutter && !validateShutterSpeed(String(shutter))) {
            alert('シャッタースピードは "1/250" のような分数、または "1" のような整数で入力してください。');
            return;
        }

        // ✅ 座標の解析 (北43.25°, 東141.35° or 43.25, 141.35 形式)
        let finalLat = formData.latitude;
        let finalLng = formData.longitude;
        if (formData.coordsInput.includes(',') || formData.coordsInput.includes('，')) {
            const parts = formData.coordsInput.split(/[,，]/);
            const parseCoord = (s: string, negChar: string) => {
                const num = parseFloat(s.replace(/[^\d.-]/g, ''));
                return s.includes(negChar) ? -Math.abs(num) : num;
            };
            const la = parseCoord(parts[0], '南');
            const ln = parseCoord(parts[1], '西');
            if (!isNaN(la) && !isNaN(ln)) {
                finalLat = la;
                finalLng = ln;
            }
        }

        // ✅ 住所の結合
        const fullAddress = formData.address || [formData.addressZip, formData.addressPref, formData.addressCity].filter(Boolean).join(' ');

        setSaving(true);
        const token = await user.getIdToken();
        const result = await updatePhoto(photoId, {
            ...formData,
            latitude: finalLat,
            longitude: finalLng,
            address: fullAddress,
            shotAt: shotAtEnabled ? formData.shotAt : '', // 撮影日なしの場合は空文字列
            event: formData.event || '', // すべてのカテゴリーでイベント名を保存
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
                                    <Tag className="w-4 h-4 mr-2 text-blue-500" />
                                    イベント名
                                </label>
                                <input
                                    type="text"
                                    value={formData.event}
                                    onChange={(e) => setFormData({ ...formData, event: e.target.value })}
                                    className="w-full border-gray-200 border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    placeholder="例: コミケ105, デザインフェスタ"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">※ 全カテゴリーで入力可能です。ポートフォリオで強調表示されます。</p>
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
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="flex-1 border-gray-200 border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                        placeholder="住所、建物名、または GPS(緯度,経度)"
                                    />
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!formData.location) return;
                                            try {
                                                const coords = await getCoordinatesAction(formData.location);
                                                if (coords) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        latitude: coords.lat,
                                                        longitude: coords.lng,
                                                        address: coords.displayName || ''
                                                    }));
                                                } else {
                                                    alert('位置情報が見つかりませんでした。別の言葉で試してみてください。');
                                                }
                                            } catch (err) {
                                                console.error('Search error:', err);
                                                alert('検索中にエラーが発生しました。');
                                            }
                                        }}
                                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg text-xs font-bold transition-all border border-blue-100"
                                    >
                                        検索
                                    </button>
                                </div>

                                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-green-500" />
                                        詳細な撮影地・住所入力
                                        <span className="ml-auto text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">最優先</span>
                                    </label>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <p className="text-[9px] text-gray-400 font-bold">郵便番号</p>
                                            <input type="text" value={formData.addressZip} onChange={e => setFormData({ ...formData, addressZip: e.target.value })} className="w-full border-gray-200 border bg-white rounded p-2 text-xs" placeholder="100-0001" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] text-gray-400 font-bold">都道府県</p>
                                            <input type="text" value={formData.addressPref} onChange={e => setFormData({ ...formData, addressPref: e.target.value })} className="w-full border-gray-200 border bg-white rounded p-2 text-xs" placeholder="東京都" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-[9px] text-gray-400 font-bold">市区町村・番地・建物名</p>
                                        <input type="text" value={formData.addressCity} onChange={e => setFormData({ ...formData, addressCity: e.target.value })} className="w-full border-gray-200 border bg-white rounded p-2 text-xs" placeholder="ノトカリ市 モシリ野 7-4" />
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-[9px] text-gray-400 font-bold tracking-wider">規定住所一括入力 (Smart Parse)</p>
                                        <textarea
                                            value={formData.address}
                                            onChange={(e) => {
                                                const input = e.target.value;
                                                const zipMatch = input.match(/(?:〒?\s?)(\d{3}-\d{4}|\d{7})/);
                                                const zip = zipMatch ? (zipMatch[1].includes('-') ? zipMatch[1] : `${zipMatch[1].slice(0, 3)}-${zipMatch[1].slice(3)}`) : '';

                                                const prefMatch = input.match(/(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/);
                                                const pref = prefMatch ? prefMatch[1] : '';

                                                let addr = input;
                                                if (zipMatch) addr = addr.replace(zipMatch[0], '');
                                                if (prefMatch) addr = addr.replace(prefMatch[0], '');
                                                addr = addr.replace(/^[\s　,]+|[\s　,]+$/g, '');

                                                setFormData(prev => ({
                                                    ...prev,
                                                    address: input,
                                                    addressZip: zip || prev.addressZip,
                                                    addressPref: pref || prev.addressPref,
                                                    addressCity: addr || prev.addressCity
                                                }));
                                            }}
                                            className="w-full border-gray-200 border bg-white rounded p-2 text-xs h-16 resize-none"
                                            placeholder="例: 〒 XXX-XXXX 蝦夷地 ノトカリ市 モシリ野 7-4"
                                        />
                                        <p className="text-[9px] text-amber-600 font-medium">※ 住所を貼り付けると郵便番号・都道府県・市区町村を自動抽出します。</p>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-gray-200">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase">
                                            座標 (緯度, 経度)
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={formData.coordsInput}
                                                onChange={e => setFormData({ ...formData, coordsInput: e.target.value })}
                                                className="flex-1 border-gray-200 border bg-white rounded p-2 text-xs font-mono"
                                                placeholder="35.6895, 139.6917"
                                            />
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    // 1. まず座標入力欄（北... 東... など）の解析を試みる
                                                    if (formData.coordsInput) {
                                                        const parts = formData.coordsInput.split(/[,，]/);
                                                        if (parts.length >= 2) {
                                                            const parseCoord = (s: string, negChar: string) => {
                                                                const num = parseFloat(s.replace(/[^\d.-]/g, ''));
                                                                return s.includes(negChar) ? -Math.abs(num) : num;
                                                            };
                                                            const la = parseCoord(parts[0], '南');
                                                            const ln = parseCoord(parts[1], '西');
                                                            if (!isNaN(la) && !isNaN(ln)) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    latitude: la,
                                                                    longitude: ln,
                                                                    coordsInput: `${la}, ${ln}` // 正規化して表示
                                                                }));
                                                                return; // 解析できたら終了
                                                            }
                                                        }
                                                    }

                                                    // 2. 座標欄が空、または解析不能な場合は住所から検索
                                                    const query = formData.address || [formData.addressZip, formData.addressPref, formData.addressCity].filter(Boolean).join(' ');
                                                    if (!query) return;
                                                    setSearchingLocation(true);
                                                    setLocationCandidates([]);
                                                    try {
                                                        const { searchCoordinatesAction } = await import('@/lib/actions/photos');
                                                        const results = await searchCoordinatesAction(query);

                                                        if (results && results.length > 0) {
                                                            if (results.length === 1) {
                                                                const res = results[0];
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    coordsInput: `${res.lat}, ${res.lng}`,
                                                                    latitude: res.lat,
                                                                    longitude: res.lng,
                                                                    address: prev.address || res.displayName || ''
                                                                }));
                                                            } else {
                                                                // 複数候補がある場合
                                                                setLocationCandidates(results);
                                                            }
                                                        } else {
                                                            alert('候補が見つかりませんでした。より詳細な住所を入力してください。');
                                                        }
                                                    } catch (e) {
                                                        console.error(e);
                                                        alert('検索中にエラーが発生しました。');
                                                    } finally {
                                                        setSearchingLocation(false);
                                                    }
                                                }}
                                                disabled={searchingLocation}
                                                className={`px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px] font-bold hover:bg-blue-100 transition-colors ${searchingLocation ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {searchingLocation ? '検索中...' : '反映 & 座標取得'}
                                            </button>
                                        </div>

                                        {/* ✅ 候補リストの表示 */}
                                        {locationCandidates.length > 0 && (
                                            <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <p className="text-[10px] font-bold text-blue-600 flex items-center gap-1.5 mb-2">
                                                    <MapPin className="w-3 h-3" />
                                                    該当する場所を選択してください ({locationCandidates.length}件見つかりました)
                                                </p>
                                                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                                    {locationCandidates.map((cand, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    coordsInput: `${cand.lat}, ${cand.lng}`,
                                                                    latitude: cand.lat,
                                                                    longitude: cand.lng,
                                                                    address: cand.displayName || prev.address
                                                                }));
                                                                setLocationCandidates([]);
                                                            }}
                                                            className="w-full text-left p-2 rounded-lg bg-white border border-blue-50 hover:border-blue-300 hover:shadow-sm transition-all group"
                                                        >
                                                            <div className="text-[10px] font-bold text-gray-700 group-hover:text-blue-600 truncate">
                                                                {cand.displayName}
                                                            </div>
                                                            <div className="text-[8px] text-gray-400 mt-0.5">
                                                                {cand.lat.toFixed(5)}, {cand.lng.toFixed(5)} ({cand.type || 'unknown'})
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setLocationCandidates([])}
                                                    className="w-full text-[9px] text-gray-400 hover:text-gray-600 py-1"
                                                >
                                                    キャンセル
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ✅ マッププレビュー (OpenStreetMap Fallback) */}
                                {/* ✅ マッププレビュー (OpenStreetMap Fallback) */}
                                {(() => {
                                    const lat = typeof formData.latitude === 'string' ? parseFloat(formData.latitude) : formData.latitude;
                                    const lng = typeof formData.longitude === 'string' ? parseFloat(formData.longitude) : formData.longitude;
                                    const isValid = (lat !== null && !isNaN(lat)) && (lng !== null && !isNaN(lng));

                                    console.log(`[Map Preview Debug]`, {
                                        latitude: formData.latitude,
                                        longitude: formData.longitude,
                                        parsedLat: lat,
                                        parsedLng: lng,
                                        isValid,
                                        coordsInput: formData.coordsInput
                                    });

                                    if (isValid && lat !== null && lng !== null) {
                                        return (
                                            <div className="mt-4 group/map relative">
                                                <LeafletMap
                                                    lat={lat}
                                                    lng={lng}
                                                    height="320px"
                                                    className="rounded-2xl overflow-hidden shadow-lg border border-gray-100"
                                                />
                                                <div className="absolute top-3 left-3 z-[1000] px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-xl text-[10px] font-bold text-gray-700 border border-gray-100 shadow-sm pointer-events-none flex items-center gap-1.5">
                                                    <MapPin className="w-3 h-3 text-blue-500" />
                                                    Preview
                                                </div>
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-bold text-blue-600 shadow-lg border border-blue-100 hover:bg-blue-50 transition-all transform hover:scale-105"
                                                >
                                                    Google Maps で詳細を確認 ↗
                                                </a>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="mt-4 p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-center">
                                            <p className="text-[10px] text-gray-400">有効な座標が入力されるとここに地図が表示されます</p>
                                        </div>
                                    );
                                })()}
                                <p className="text-[10px] text-gray-400 mt-2 italic">※ 「検索」ボタンで住所からGPS座標を取得できます。座標は手動入力も可能です。</p>
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
                                <SmartDatePicker
                                    value={formData.shotAt}
                                    onChange={(val) => setFormData({ ...formData, shotAt: val })}
                                    disabled={!shotAtEnabled}
                                    className="w-full"
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
                                            type="text"
                                            list="aperture-list"
                                            value={formData.exif?.FNumber || ''}
                                            onChange={(e) => setFormData({ ...formData, exif: { ...formData.exif, FNumber: e.target.value } })}
                                            className="w-full border-gray-100 border bg-gray-50/50 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-300"
                                            placeholder="1.4"
                                        />
                                        <datalist id="aperture-list">
                                            {STANDARD_APERTURES
                                                .filter(val => parseFloat(val) >= getMinApertureFromLens(formData.exif?.LensModel))
                                                .map(val => (
                                                    <option key={val} value={val}>f/{val}</option>
                                                ))
                                            }
                                        </datalist>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 mb-1">SS (分数/整数)</p>
                                        <input
                                            type="text"
                                            value={formData.exif?.ExposureTime || ''}
                                            onChange={(e) => setFormData({ ...formData, exif: { ...formData.exif, ExposureTime: e.target.value } })}
                                            className={`w-full border p-2 text-xs outline-none focus:ring-1 rounded-lg ${formData.exif?.ExposureTime && !validateShutterSpeed(String(formData.exif.ExposureTime)) ? 'border-red-500 bg-red-50 focus:ring-red-300' : 'border-gray-100 bg-gray-50/50 focus:ring-blue-300'}`}
                                            placeholder="例: 1/250"
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
                </div >
            </div >

            {/* ✅ ロケーション確認用オーバーレイ */}
            <AnimatePresence>
                {showLocationConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 text-center space-y-6">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto ring-8 ring-blue-50">
                                    <MapPin className="w-8 h-8 text-blue-600" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xl font-bold text-gray-900 tracking-tight">撮影地の確認</h4>
                                    <p className="text-sm text-gray-500">この内容で撮影地を設定してよろしいですか？</p>
                                </div>

                                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                                    <div className="text-left space-y-3">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Address / Info</span>
                                            <p className="text-xs text-gray-800 leading-relaxed font-bold">
                                                {formData.address || formData.location || '住所情報なし'}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zip Code</span>
                                                <p className="text-xs text-gray-800 font-mono font-bold">{formData.addressZip || '-'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prefecture</span>
                                                <p className="text-xs text-gray-800 font-bold">{formData.addressPref || '-'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {formData.latitude !== null && formData.longitude !== null && (
                                        <div className="w-full h-32 rounded-xl overflow-hidden border border-gray-100 shadow-inner">
                                            <LeafletMap
                                                lat={formData.latitude}
                                                lng={formData.longitude}
                                                height="128px"
                                                className="w-full h-full"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowLocationConfirm(false)}
                                        className="py-4 rounded-2xl font-bold text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-all text-sm active:scale-95"
                                    >
                                        いいえ、修正
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsLocationConfirmed(true);
                                            setShowLocationConfirm(false);
                                            // dispatch submit
                                            setTimeout(() => {
                                                const form = document.querySelector('form');
                                                if (form) {
                                                    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                                                }
                                            }, 100);
                                        }}
                                        className="py-4 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                                    >
                                        はい、正しい
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
