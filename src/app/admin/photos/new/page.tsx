'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/components/admin/AuthProvider';
import { savePhotosBulk, getExifSuggestions } from '@/lib/actions/photos';
import { getCategories, Category } from '@/lib/actions/categories';
import { getSubjects, Subject } from '@/lib/actions/subjects';
import CloudinaryScript from '@/components/admin/CloudinaryScript';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import exifr from 'exifr';
import { formatShutterSpeed, validateShutterSpeed, STANDARD_APERTURES, getMinApertureFromLens } from '@/lib/utils/exif';
import { motion } from 'framer-motion';
import SmartDatePicker from '@/components/admin/SmartDatePicker';
import LeafletMap from '@/components/common/LeafletMap';
import { Calendar, User, MapPin, Tag, Link2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

// ✅ ファイル検証定数
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE_MB = 50; // アップロード時に選択できる最大サイズ（UI上）
const CLOUDINARY_MAX_MB = 10; // CloudinaryのFreeプランの1ファイル容量限界
const MAX_FILES = 20;
const MAX_RETRY = 5;
const CHUNK_SIZE = 6 * 1024 * 1024; // Cloudinary要件「最後のチャンク以外は最低5MB以上必要」に対応
const HISTORY_KEY = 'upload_history';
const LENS_HISTORY_KEY = 'lens_history';

// ✅ アップロード済みファイル型
interface UploadedFile {
    url: string;
    publicId: string;
    exif?: Record<string, unknown>;
    tags?: string[];
    fileName?: string;
    fileSize?: number;
    fileHash?: string; // 重複チェック用
}

// ✅ アップロード履歴型
interface HistoryEntry {
    url: string;
    publicId: string;
    fileName: string;
    uploadedAt: string;
}

// ✅ ファイルハッシュ生成（重複チェック用）
async function computeFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}



// ✅ XHRアップロード（リアルタイム進捗 + 大容量対応）
function xhrUpload(
    url: string,
    formData: FormData,
    onProgress: (pct: number) => void
): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.timeout = 300000; // 5分タイムアウト（大容量対応）
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    resolve(JSON.parse(xhr.responseText));
                } catch {
                    reject(new Error('レスポンス解析エラー'));
                }
            } else {
                try {
                    const err = JSON.parse(xhr.responseText);
                    reject(new Error(err?.error?.message || `アップロード失敗 (HTTP ${xhr.status})`));
                } catch {
                    reject(new Error(`アップロード失敗 (HTTP ${xhr.status})`));
                }
            }
        };
        xhr.onerror = () => reject(new Error('ネットワークエラー: 接続を確認してください'));
        xhr.ontimeout = () => reject(new Error('タイムアウト: 回線が遅い可能性があります（5分超過）'));
        xhr.send(formData);
    });
}

// ✅ チャンク分割アップロード（大容量ファイル用）
async function chunkedUpload(
    cloudName: string,
    blob: Blob,
    uploadParams: Record<string, string>,
    signature: string,
    apiKey: string,
    onProgress: (pct: number) => void
): Promise<Record<string, unknown>> {
    const totalSize = blob.size;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const uniqueId = `chunked-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    let result: Record<string, unknown> = {};

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalSize);
        const chunk = blob.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk, `upload_chunk`);
        formData.append('signature', signature);
        formData.append('api_key', apiKey);

        // 🚨 IMPORTANT: チャンクアップロード使用時（X-Unique-Upload-Id 送信時）、
        // Cloudinary はなぜか signed upload であっても upload_preset を要求するバグ/仕様があるため明示的に必須とする
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'next-portfolio');

        Object.entries(uploadParams).forEach(([key, value]) => {
            if (key !== 'upload_preset') formData.append(key, value);
        });

        // Content-Range ヘッダーで分割送信
        const contentRange = `bytes ${start}-${end - 1}/${totalSize}`;

        result = await new Promise<Record<string, unknown>>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', uploadUrl);
            xhr.timeout = 120000; // チャンクあたり2分
            xhr.setRequestHeader('X-Unique-Upload-Id', uniqueId);
            xhr.setRequestHeader('Content-Range', contentRange);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const chunkProgress = (e.loaded / e.total);
                    const overallProgress = ((i + chunkProgress) / totalChunks) * 100;
                    onProgress(Math.round(overallProgress));
                }
            };
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try { resolve(JSON.parse(xhr.responseText)); }
                    catch { reject(new Error('チャンク応答の解析失敗')); }
                } else {
                    try {
                        const err = JSON.parse(xhr.responseText);
                        reject(new Error(err?.error?.message || `チャンク${i + 1}送信失敗`));
                    } catch {
                        reject(new Error(`チャンク${i + 1}送信失敗 (HTTP ${xhr.status})`));
                    }
                }
            };
            xhr.onerror = () => reject(new Error(`チャンク${i + 1}: ネットワークエラー`));
            xhr.ontimeout = () => reject(new Error(`チャンク${i + 1}: タイムアウト`));
            xhr.send(formData);
        });
    }

    return result; // 最後のチャンクのレスポンスが完全な結果
}


export default function NewPhotoPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [widgetLoaded, setWidgetLoaded] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [uploadQueue, setUploadQueue] = useState<{
        name: string;
        status: 'queued' | 'resizing' | 'converting' | 'uploading' | 'processing' | 'done' | 'error';
        progress: number;
        error?: string;
        duplicate?: boolean;
    }[]>([]);

    // フォーム状態
    const [title, setTitle] = useState('');
    const [subjectName, setSubjectName] = useState('');
    const [characterName, setCharacterName] = useState('');
    const [location, setLocation] = useState('');
    const [address, setAddress] = useState('');
    const [addressZip, setAddressZip] = useState('');
    const [addressPref, setAddressPref] = useState('');
    const [addressCity, setAddressCity] = useState('');
    const [addressDetail, setAddressDetail] = useState('');
    const [coordsInput, setCoordsInput] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [shotAt, setShotAt] = useState('');
    const [shotAtEnabled, setShotAtEnabled] = useState(true);
    const [snsUrl, setSnsUrl] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [event, setEvent] = useState('');
    const [displayMode, setDisplayMode] = useState<'title' | 'character'>('title');
    const [isDragging, setIsDragging] = useState(false);
    const dropZoneRef = useRef<HTMLLabelElement>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [camera, setCamera] = useState('');
    const [lens, setLens] = useState('');
    const [exifSuggestions, setExifSuggestions] = useState<{ models: string[], lensModels: string[] }>({ models: [], lensModels: [] });
    // ✅ 撮影データ（分数シャッタースピード対応）
    const [shutter, setShutter] = useState('');   // 例: "1/250"
    const [aperture, setAperture] = useState(''); // 例: "f/1.4"
    const [iso, setIso] = useState('');           // 例: "800"
    // ✅ レンズ型番履歴（localStorage）
    const [lensHistory, setLensHistory] = useState<string[]>([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [message, setMessage] = useState('');
    const [subjects, setSubjects] = useState<Subject[]>([]);

    // ✅ 新機能: 一括タグ
    const [batchTags, setBatchTags] = useState('');
    const [tagInput, setTagInput] = useState('');

    // ✅ 新機能: プレビューモーダル
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // ✅ 新機能: アップロード履歴
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    // ✅ 新機能: クライアント側EXIF保持
    const [fileExifMap, setFileExifMap] = useState<Map<string, any>>(new Map());

    // ✅ 新機能: AI自動タグ
    const [useAiTags, setUseAiTags] = useState(true);
    const [searchingLocation, setSearchingLocation] = useState(false);
    const [locationCandidates, setLocationCandidates] = useState<any[]>([]);
    const [showLocationConfirm, setShowLocationConfirm] = useState(false);
    const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);

    // ✅ 署名取得
    const fetchSignature = async (paramsToSign: Record<string, any>) => {
        const idToken = await user?.getIdToken();
        const res = await fetch(`/api/upload/sign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ paramsToSign })
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({})) as { error?: string };
            throw new Error(errBody.error || 'Signature fetch failed');
        }
        return await res.json() as { signature: string; timestamp: number; apiKey: string; cloudName: string };
    };

    const reflectExifToForm = (mergedExif: any) => {
        // ⚠️ [FIX] Do NOT auto-fill "Common Settings" (shutter, aperture, etc.) from individual files.
        // This prevents the "Last File Overwrite" bug where the last uploaded photo's settings
        // become the enforced settings for the entire batch.

        // We ONLY update the Lens History for convenience, but do NOT set the 'lens' or 'camera' state
        // unless you want to enforce it for ALL photos.

        if (mergedExif.LensModel) {
            let newLens = mergedExif.LensModel as string;
            const TARGET_LENS_PATTERN = /voigtlander|nokton|40mm/i;
            const CORRECT_LENS_NAME = 'voigtlander NOKTON classic 40mm F1.4 SC';

            if (TARGET_LENS_PATTERN.test(newLens) && newLens.includes('40mm')) {
                newLens = CORRECT_LENS_NAME;
            } else {
                const lowerNew = newLens.trim().toLowerCase();
                const matchedMaster = exifSuggestions.lensModels.find(m => m.toLowerCase() === lowerNew);
                if (matchedMaster) {
                    newLens = matchedMaster;
                }
            }

            // Only update history, don't auto-fill the "Common Lens" input
            setLensHistory(prevHistory => {
                const updated = [newLens, ...prevHistory.filter(l => l !== newLens)].slice(0, 30);
                try { localStorage.setItem(LENS_HISTORY_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
                return updated;
            });
        }

        // ✅ [NEW] 自動取得したシャッタースピードを分数/整数形式に変換してセット
        if (mergedExif.ExposureTime) {
            const formatted = formatShutterSpeed(mergedExif.ExposureTime);
            if (formatted) setShutter(formatted);
        }
        if (mergedExif.FNumber) {
            setAperture(`f/${mergedExif.FNumber}`);
        }
        if (mergedExif.ISOSpeedRatings || mergedExif.ISO) {
            setIso(String(mergedExif.ISOSpeedRatings || mergedExif.ISO));
        }

        // ✅ GPS情報の反映 (coordsInput)
        if (mergedExif.latitude && mergedExif.longitude) {
            setCoordsInput(`${mergedExif.latitude}, ${mergedExif.longitude}`);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [catResult, subResult] = await Promise.all([
                    getCategories(),
                    getSubjects()
                ]);
                if (catResult.success) setCategories(catResult.data);
                if (subResult.success) setSubjects(subResult.data);

                if (user) {
                    const idToken = await user.getIdToken();
                    const { getMyProfile } = await import('@/lib/actions/users');
                    const myProfile = await getMyProfile(idToken);
                    if (myProfile.success && myProfile.data?.snsLinks?.length > 0) {
                        setSnsUrl(myProfile.data.snsLinks[0].value);
                    }
                }
            } catch (err: unknown) {
                setErrorMsg(err instanceof Error ? err.message : 'Data load error');
            }
            getExifSuggestions().then(res => {
                if (res.success && res.data) setExifSuggestions(res.data);
            });

            // ✅ 履歴をlocalStorageから読み込み
            try {
                const raw = localStorage.getItem(HISTORY_KEY);
                if (raw) setHistory(JSON.parse(raw));
            } catch { /* ignore */ }

            // ✅ レンズ型番履歴をlocalStorageから読み込み
            try {
                const rawLens = localStorage.getItem(LENS_HISTORY_KEY);
                if (rawLens) setLensHistory(JSON.parse(rawLens));
            } catch { /* ignore */ }
        };
        loadInitialData();
    }, [user]);

    // ✅ ファイル検証
    const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
        const valid: File[] = [];
        const errors: string[] = [];
        for (const file of files) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                errors.push(`${file.name}: 非対応のファイル形式です（JPG/PNG/WebP/HEICのみ）`);
                continue;
            }
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                errors.push(`${file.name}: ${MAX_FILE_SIZE_MB}MB を超えています`);
                continue;
            }
            valid.push(file);
        }
        return { valid, errors };
    };

    // ✅ D&D ハンドラー
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) processFiles(files);
    };

    const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        processFiles(Array.from(files));
    };

    const processFiles = async (rawFiles: File[]) => {
        const { resizeImageClient } = await import('@/lib/utils/client-image');

        setLoading(true);
        setErrorMsg('');

        // ✅ ファイル検証
        const { valid: validFiles, errors: validationErrors } = validateFiles(rawFiles);
        if (validationErrors.length > 0) setErrorMsg(validationErrors.join('\n'));
        if (validFiles.length === 0) { setLoading(false); return; }

        let fileArray = validFiles;
        if (fileArray.length > MAX_FILES) {
            setErrorMsg(`一度にアップロードできるのは${MAX_FILES}枚までです。最初の${MAX_FILES}枚のみを処理します。`);
            fileArray = fileArray.slice(0, MAX_FILES);
        }

        // ✅ 重複チェック: 既存のアップロード済みファイルと比較
        const existingHashes = new Set(uploadedFiles.map(f => f.fileHash).filter(Boolean));
        const duplicates: string[] = [];

        const fileHashMap = new Map<string, string>();
        await Promise.all(fileArray.map(async (file) => {
            const hash = await computeFileHash(file);
            fileHashMap.set(file.name, hash);
            if (existingHashes.has(hash)) {
                duplicates.push(file.name);
            }
        }));

        if (duplicates.length > 0) {
            const proceed = confirm(
                `以下のファイルは既にアップロード済みの可能性があります:\n${duplicates.join('\n')}\n\n続けてアップロードしますか？`
            );
            if (!proceed) {
                fileArray = fileArray.filter(f => !duplicates.includes(f.name));
                if (fileArray.length === 0) { setLoading(false); return; }
            }
        }

        // 初期キューをセット
        setUploadQueue(prev => [
            ...prev,
            ...fileArray.map(f => ({ name: f.name, status: 'queued' as const, progress: 0 }))
        ]);

        // --- 🏎️ TURBO MODE: Direct Cloudinary Upload (with XHR progress + auto-retry) ---
        const CONCURRENCY = 2; // 安定性のため2並列に制限
        for (let i = 0; i < fileArray.length; i += CONCURRENCY) {
            const batch = fileArray.slice(i, i + CONCURRENCY);
            await Promise.all(batch.map(async (file) => {
                const updateStatus = (
                    status: 'queued' | 'resizing' | 'converting' | 'uploading' | 'processing' | 'done' | 'error',
                    progress: number = 0,
                    error?: string
                ) => {
                    setUploadQueue(prev => prev.map(item =>
                        item.name === file.name ? { ...item, status, progress, error } : item
                    ));
                };

                const fileHash = fileHashMap.get(file.name) || '';

                // ✅ EXIF解析 + リサイズは初回のみ（リトライ時はスキップ）
                let clientExif: any = null;
                let fileToUpload: File | Blob = file;

                try {
                    updateStatus('processing', 5);
                    clientExif = await exifr.parse(file, {
                        tiff: true, xmp: true, exif: true, gps: true,
                    });
                    if (clientExif) {
                        setFileExifMap(prev => new Map(prev).set(fileHash, clientExif));
                        reflectExifToForm(clientExif);
                    }
                } catch (e) {
                    console.warn('EXIF parse failed:', e);
                }

                try {
                    updateStatus('resizing', 15, '圧縮中 (2500px)...');
                    fileToUpload = await resizeImageClient(file, 2500, 2500, 0.82);
                } catch (firstErr) {
                    console.warn('[Upload] 1度目のリサイズに失敗 (メモリ不足等). 1600pxで再試行...', firstErr);
                    try {
                        updateStatus('resizing', 15, 'サイズを下げて再圧縮中 (1600px)...');
                        fileToUpload = await resizeImageClient(file, 1600, 1600, 0.7);
                    } catch (secondErr) {
                        console.error('[Upload] 全リサイズ処理に失敗:', secondErr);
                        const errMsg = secondErr instanceof Error ? secondErr.message : 'メモリ不足';
                        updateStatus('error', 0, `端末のメモリ不足等により写真を圧縮できませんでした。少し時間を空けるか小さな写真をお試しください。(${errMsg})`);
                        return; // ⚠️ リサイズに失敗した巨大画像をそのまま強制アップロードさせるのをここで防ぐ（非常に重要）
                    }
                }

                const fileSizeMB = (fileToUpload instanceof Blob ? fileToUpload.size : file.size) / (1024 * 1024);
                console.log(`[Upload] ${file.name}: リサイズ後 ${fileSizeMB.toFixed(1)}MB`);

                // 🚨 サーバー（Cloudinary無料枠）の絶対限界をチェック
                if (fileSizeMB > CLOUDINARY_MAX_MB) {
                    updateStatus('error', 0, `圧縮後も${fileSizeMB.toFixed(1)}MBあり、サーバーの上限(${CLOUDINARY_MAX_MB}MB)を超えています。エラーになるため送信を中止しました。`);
                    return; // 10MB越えは絶対に失敗するので無駄なトライを防ぐ
                }

                for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
                    try {
                        updateStatus('uploading', 25, attempt > 1 ? `リトライ ${attempt}/${MAX_RETRY}...` : undefined);

                        // ✅ Cloudinary 署名取得
                        const timestamp = Math.round(new Date().getTime() / 1000);
                        const uploadParams: Record<string, any> = {
                            timestamp,
                            folder: 'portfolio',
                            upload_preset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'next-portfolio',
                        };
                        if (useAiTags) uploadParams.auto_tagging = '0.6';

                        const { signature, apiKey, cloudName } = await fetchSignature(uploadParams);
                        const actualCloudName = cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
                        if (!actualCloudName) throw new Error('Cloudinary Cloud Name 未設定');

                        let result: Record<string, unknown>;

                        if (fileSizeMB > 5) {
                            // ✅ 大容量: チャンク分割アップロード
                            updateStatus('uploading', 28, `分割アップロード中 (${fileSizeMB.toFixed(1)}MB)...`);
                            result = await chunkedUpload(
                                actualCloudName,
                                fileToUpload,
                                {
                                    timestamp: String(timestamp),
                                    ...Object.fromEntries(
                                        Object.entries(uploadParams)
                                            .filter(([k]) => k !== 'timestamp')
                                            .map(([k, v]) => [k, String(v)])
                                    ),
                                },
                                signature,
                                apiKey,
                                (pct) => updateStatus('uploading', 28 + Math.round(pct * 0.62))
                            );
                        } else {
                            // ✅ 通常サイズ: 一括アップロード
                            const formData = new FormData();
                            formData.append('file', fileToUpload);
                            formData.append('signature', signature);
                            formData.append('api_key', apiKey);
                            formData.append('timestamp', String(timestamp));
                            Object.entries(uploadParams).forEach(([key, value]) => {
                                if (key !== 'timestamp') formData.append(key, String(value));
                            });

                            result = await xhrUpload(
                                `https://api.cloudinary.com/v1_1/${actualCloudName}/image/upload`,
                                formData,
                                (pct) => updateStatus('uploading', 28 + Math.round(pct * 0.62))
                            );
                        }

                        updateStatus('processing', 92);

                        const newFile: UploadedFile = {
                            url: result.secure_url as string,
                            publicId: result.public_id as string,
                            exif: result.exif as Record<string, unknown>, // Cloudinary's parsed EXIF
                            tags: result.tags as string[],
                            fileName: file.name,
                            fileSize: file.size,
                            fileHash,
                        };
                        setUploadedFiles(prev => [...prev, newFile]);

                        // ✅ アップロード後も最新のEXIF（Cloudinary提供分含む）を反映
                        const mergedExif = { ...(clientExif || {}), ...(result.exif || {}) };
                        reflectExifToForm(mergedExif);

                        // ✅ アップロード履歴に追加
                        const entry: HistoryEntry = {
                            url: result.secure_url as string,
                            publicId: result.public_id as string,
                            fileName: file.name,
                            uploadedAt: new Date().toISOString(),
                        };
                        setHistory(prev => {
                            const updated = [entry, ...prev].slice(0, 50);
                            try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
                            return updated;
                        });

                        updateStatus('done', 100);
                        break;
                    } catch (err: unknown) {
                        const errMsg = err instanceof Error ? err.message : '不明なエラー';
                        if (attempt === MAX_RETRY) {
                            updateStatus('error', 0, `失敗 (${MAX_RETRY}回試行): ${errMsg}`);
                        } else {
                            // 指数バックオフ: 2秒, 4秒, 8秒, 16秒...
                            const waitSec = Math.pow(2, attempt);
                            updateStatus('uploading', 10, `${waitSec}秒後にリトライ (${attempt}/${MAX_RETRY}): ${errMsg}`);
                            await new Promise(r => setTimeout(r, waitSec * 1000));
                        }
                    }
                }
            }));
        }
        setLoading(false);
    };

    const handleOtherSourcesClick = useCallback(() => {
        if (!widgetLoaded || !(window as any).cloudinary) return;
        const widget = (window as any).cloudinary.createUploadWidget(
            {
                cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
                uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                sources: ['camera', 'url'],
                defaultSource: 'url',
                multiple: true,
                maxFiles: 20,
                clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
                maxImageFileSize: 100000000,
                folder: 'portfolio',
                language: 'ja',
                styles: {
                    palette: {
                        window: '#0F172A', sourceBg: '#1E293B', windowBorder: '#334155',
                        tabIcon: '#38BDF8', inactiveTabIcon: '#94A3B8', menuIcons: '#F1F5F9',
                        link: '#38BDF8', action: '#3B82F6', inProgress: '#0EA5E9',
                        complete: '#10B981', error: '#EF4444', textLight: '#F1F5F9', textDark: '#0F172A'
                    },
                },
            },
            async (error: unknown, result: any) => {
                if (!error && result && result.event === 'success') {
                    setUploadedFiles(prev => [...prev, {
                        url: result.info.secure_url,
                        publicId: result.info.public_id,
                        tags: result.info.tags,
                    }]);
                }
            }
        );
        widget.open();
    }, [widgetLoaded]);

    // ✅ タグ追加
    const addTag = () => {
        const tag = tagInput.trim();
        if (!tag) return;
        const existing = batchTags ? batchTags.split(',').map(t => t.trim()) : [];
        if (!existing.includes(tag)) {
            setBatchTags([...existing, tag].join(', '));
        }
        setTagInput('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || uploadedFiles.length === 0) return;

        setLoading(true);
        setErrorMsg('');

        // ✅ ロケーションの確認
        const hasLocationInfo = latitude !== null || longitude !== null || address.trim() || addressZip.trim();
        if (hasLocationInfo && !isLocationConfirmed) {
            setShowLocationConfirm(true);
            setLoading(false);
            return;
        }

        // ✅ シャッタースピードのバリデーション

        try {
            const idToken = await user.getIdToken();
            const extraTags = batchTags ? batchTags.split(',').map(t => t.trim()).filter(Boolean) : [];

            const dataList = uploadedFiles.map(file => {
                // ✅ 撮影日の決定ロジック
                let finalShotAt = '';
                if (shotAtEnabled) {
                    if (shotAt) {
                        // 1. 共通入力があればそれを優先
                        finalShotAt = shotAt;
                    } else {
                        // 2. 共通入力が空なら、写真自体のEXIFから取得を試みる
                        const rawDate = (file.exif?.DateTimeOriginal || file.exif?.DateTime) as string | undefined;
                        if (rawDate && typeof rawDate === 'string' && /^\d{4}[:\-]\d{2}[:\-]\d{2}/.test(rawDate)) {
                            finalShotAt = rawDate.substring(0, 10).replace(/:/g, '-');
                        } else {
                            // 3. どちらもなければ今日の日付（追加日）
                            finalShotAt = new Date().toISOString().split('T')[0];
                        }
                    }
                }

                // ✅ 最終的なデータ構築: Cloudinary EXIF と Client EXIF をマージ
                const clientExif = fileExifMap.get(file.fileHash || '') || {};
                const mergedExif = { ...clientExif, ...(file.exif || {}) };

                // ✅ 座標の決定 (個別ファイルごとではなく共通設定を使用)
                const finalLat = latitude;
                const finalLng = longitude;

                // ✅ 住所の結合
                const fullAddress = address || [addressZip, addressPref, addressCity, addressDetail].filter(Boolean).join(' ');

                return {
                    url: file.url,
                    publicId: file.publicId,
                    title,
                    subjectName,
                    characterName,
                    location,
                    address: fullAddress,
                    latitude: finalLat,
                    longitude: finalLng,
                    shotAt: finalShotAt,
                    snsUrl,
                    categoryId,
                    event: event || '',
                    displayMode,

                    exif: {
                        ...mergedExif,
                        ...(camera ? { Model: camera } : {}),
                        ...(lens ? { LensModel: lens } : {}),
                        ...(shutter ? { ExposureTime: shutter } : {}),
                        ...(aperture ? { FNumber: aperture } : {}),
                        ...(iso ? { ISOSpeedRatings: iso } : {}),
                    },
                    tags: [...(file.tags || []), ...extraTags].filter((v, i, a) => a.indexOf(v) === i),
                };
            });

            // [MODIFIED] Worker API Call (Hybrid Architecture)
            // const result = await savePhotosBulk(dataList, idToken);

            const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
            let result;

            if (workerUrl && workerUrl.startsWith('http')) {
                const res = await fetch(`${workerUrl}/api/save-photos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ photos: dataList })
                });

                if (!res.ok) {
                    const errData = await res.json() as { error?: string };
                    throw new Error(errData.error || 'Worker API error');
                }

                result = await res.json() as { success: boolean; count?: number; error?: string };
            } else {
                // Fallback to Server Action if Worker is not configured
                console.log('Worker URL not configured. Using Server Action fallback.');
                result = await savePhotosBulk(dataList, idToken);
            }

            if (result.success) {
                setMessage(`✅ ${uploadedFiles.length}枚の写真を保存しました！一覧ページに移動します...`);
                setTimeout(() => router.push('/admin/photos'), 1500);
            } else {
                setErrorMsg(result.error || '保存中にエラーが発生しました。');
            }
        } catch (error: any) {
            console.error('Upload Error:', error);
            setErrorMsg(error.message || 'エラーが発生しました。');
        }
        setLoading(false);
    };

    const statusLabel = (status: string) => {
        switch (status) {
            case 'queued': return '待機中...';
            case 'resizing': return 'リサイズ中...';
            case 'converting': return '変換中...';
            case 'uploading': return 'アップロード中...';
            case 'processing': return 'AI解析中...';
            case 'done': return '✅ 完了';
            case 'error': return '❌ 失敗';
            default: return status;
        }
    };


    return (
        <div>
            <CloudinaryScript onLoad={() => setWidgetLoaded(true)} />

            {/* ✅ プレビューモーダル */}
            {previewUrl && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setPreviewUrl(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-lg shadow-2xl" />
                        <button
                            onClick={() => setPreviewUrl(null)}
                            className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">新規写真の投稿</h1>
                {/* ✅ アップロード履歴ボタン */}
                {history.length > 0 && (
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 transition-colors"
                    >
                        🕐 履歴 ({history.length})
                    </button>
                )}
            </div>

            {/* ✅ アップロード履歴パネル */}
            {showHistory && (
                <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
                        <h3 className="font-bold text-sm text-gray-700">アップロード履歴（最近50件）</h3>
                        <button
                            onClick={() => {
                                if (confirm('履歴を全て削除しますか？')) {
                                    setHistory([]);
                                    localStorage.removeItem(HISTORY_KEY);
                                }
                            }}
                            className="text-xs text-red-400 hover:text-red-600"
                        >
                            履歴を削除
                        </button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-4 max-h-48 overflow-y-auto">
                        {history.map((entry, i) => (
                            <div key={i} className="relative aspect-square rounded overflow-hidden border bg-gray-50 group cursor-pointer" onClick={() => setPreviewUrl(entry.url)}>
                                <img src={entry.url} alt={entry.fileName} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                                    <span className="text-[8px] text-white truncate">{new Date(entry.uploadedAt).toLocaleDateString('ja-JP')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}



            <div className="flex flex-col md:flex-row gap-8">
                {/* Left: Image Upload & Previews */}
                <div className="w-full md:w-1/2">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-gray-700">アップロード状況</h2>
                            <div className="flex gap-2 items-center">
                                <div className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                                    🚀 Turboモード
                                </div>
                                <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    ℹ️ EXIF保持
                                </div>
                                {(uploadedFiles.length > 0 || uploadQueue.length > 0) && (
                                    <button
                                        onClick={() => { setUploadedFiles([]); setUploadQueue([]); }}
                                        className="text-xs text-red-500 hover:underline"
                                    >
                                        リセット
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ✅ オプション設定 */}
                        <div className="mb-4 flex gap-4 text-xs text-gray-600">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useAiTags}
                                    onChange={e => setUseAiTags(e.target.checked)}
                                    className="rounded"
                                />
                                <span>AI自動タグ</span>
                            </label>
                        </div>

                        {/* Upload Status List */}
                        {uploadQueue.length > 0 && (
                            <div className="mb-6 space-y-2">
                                {uploadQueue.map((item, idx) => (
                                    <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="truncate max-w-[180px] font-medium text-gray-600">{item.name}</span>
                                            <span className={`font-bold ${item.status === 'done' ? 'text-green-500' : item.status === 'error' ? 'text-red-500' : 'text-blue-500'}`}>
                                                {statusLabel(item.status)}
                                            </span>
                                        </div>
                                        {/* ✅ リアルタイム進捗バー */}
                                        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-200 ${item.status === 'done' ? 'bg-green-500' : item.status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}
                                                style={{ width: `${item.progress}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            {item.error && <p className="text-[10px] text-red-400">{item.error}</p>}
                                            <p className="text-[10px] text-gray-400 ml-auto">{item.progress}%</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <input
                            id="file-input"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileSelection}
                            className="hidden"
                            disabled={loading}
                        />

                        {/* ✅ プレビューグリッド（クリックで拡大） */}
                        {uploadedFiles.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mb-6">
                                {uploadedFiles.map((file, idx) => (
                                    <div
                                        key={idx}
                                        className="relative aspect-square rounded overflow-hidden border bg-gray-50 group cursor-pointer"
                                        onClick={() => setPreviewUrl(file.url)}
                                    >
                                        <img src={file.url} alt="PREVIEW" className="w-full h-full object-cover" />
                                        {/* ✅ AIタグ表示 */}
                                        {file.tags && file.tags.length > 0 && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 flex flex-wrap gap-0.5 max-h-10 overflow-hidden">
                                                {file.tags.slice(0, 3).map((tag, i) => (
                                                    <span key={i} className="text-[7px] text-white/80 bg-white/10 px-1 rounded truncate max-w-[40px]">
                                                        {tag}
                                                    </span>
                                                ))}
                                                {file.tags.length > 3 && <span className="text-[7px] text-white/50">+{file.tags.length - 3}</span>}
                                            </div>
                                        )}
                                        {/* 拡大アイコン */}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-xl">🔍</span>
                                        </div>
                                        {/* 削除ボタン */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setUploadedFiles(prev => prev.filter((_, i) => i !== idx)); }}
                                            className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                <label
                                    htmlFor="file-input"
                                    className="aspect-square border-2 border-dashed rounded flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors cursor-pointer"
                                >
                                    <span className="text-2xl">+</span>
                                </label>
                            </div>
                        )}

                        {!loading && uploadQueue.length === 0 && uploadedFiles.length === 0 && (
                            <label
                                ref={dropZoneRef}
                                htmlFor="file-input"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-lg h-36 flex items-center justify-center mb-4 cursor-pointer transition-all ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                            >
                                <div className="text-center text-gray-500 pointer-events-none">
                                    <p className="text-2xl mb-1">{isDragging ? '📂' : '📸'}</p>
                                    <p className="font-bold">{isDragging ? 'ここにドロップ！' : 'クリックまたはドラッグ&ドロップ'}</p>
                                    <p className="text-xs mt-1">JPG / PNG / WebP / HEIC・最大{MAX_FILE_SIZE_MB}MB・{MAX_FILES}枚まで</p>
                                </div>
                            </label>
                        )}

                        <div className="flex gap-2 mb-4">
                            <label
                                htmlFor="file-input"
                                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold shadow-md transition-all active:scale-[0.98] text-center cursor-pointer flex items-center justify-center"
                            >
                                {loading ? '実行中...' : (uploadedFiles.length > 0 ? 'さらに追加' : '写真を選択')}
                            </label>
                            <button
                                type="button"
                                onClick={handleOtherSourcesClick}
                                disabled={!widgetLoaded || loading}
                                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-bold border border-gray-200 transition-all active:scale-[0.98]"
                            >
                                カメラ等
                            </button>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 mt-4 px-2">
                        ※ 写真はアップロード時に自動リサイズ・最適化されます。
                    </p>
                </div>

                {/* Right: Batch Metadata Form */}
                <div className="flex-1 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="mb-6 pb-4 border-b">
                        <h2 className="font-bold text-gray-900">一括情報設定 (任意)</h2>
                        <p className="text-xs text-gray-500">ここで入力した情報は選択したすべての写真に適用されます。各写真は後から個別に編集可能です。</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {errorMsg && <div className="p-3 bg-red-50 text-red-600 rounded text-sm font-medium whitespace-pre-line">{errorMsg}</div>}
                        {message && <div className="p-3 bg-green-50 text-green-600 rounded text-sm font-medium">{message}</div>}

                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <label className="block text-sm font-bold text-gray-700 mb-2">表示モードの選択 (A または B)</label>
                            <div className="flex gap-4">
                                <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${displayMode === 'title' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                                    <input type="radio" name="displayMode" value="title" checked={displayMode === 'title'} onChange={() => setDisplayMode('title')} className="hidden" />
                                    <span className="font-bold text-sm">A: タイトルを表示</span>
                                </label>
                                <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${displayMode === 'character' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                                    <input type="radio" name="displayMode" value="character" checked={displayMode === 'character'} onChange={() => setDisplayMode('character')} className="hidden" />
                                    <span className="font-bold text-sm">B: キャラクター名を表示</span>
                                </label>
                            </div>
                            <p className="text-[10px] text-gray-400">※ 写真オーバーレイに表示する項目を選択します。</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700">共通タイトル</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例: 冬の北海道シリーズ" />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700">カテゴリー</label>
                            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md bg-white outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">未設定 (公開されません)</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700">イベント名</label>
                            <input
                                type="text"
                                value={event}
                                onChange={(e) => setEvent(e.target.value)}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="例: コミケ105, デザインフェスタ"
                            />
                            <p className="text-[10px] text-gray-400">※ 全カテゴリーで入力可能です。ポートフォリオで強調表示されます。</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">共通モデル名</label>
                                <input
                                    type="text"
                                    list="subject-candidates"
                                    value={subjectName}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        setSubjectName(newValue);
                                        const matchedSubject = subjects.find(s => s.name === newValue);
                                        if (matchedSubject?.snsUrl) setSnsUrl(matchedSubject.snsUrl);
                                    }}
                                    className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="例: モデル名"
                                />
                                <datalist id="subject-candidates">
                                    {subjects.map((s) => <option key={s.id} value={s.name} />)}
                                </datalist>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">キャラクター名</label>
                                <input type="text" value={characterName} onChange={(e) => setCharacterName(e.target.value)} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500" placeholder="例: キャラ名 (作品名)" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">共通カメラ名</label>
                                <input type="text" list="camera-candidates" value={camera} onChange={(e) => setCamera(e.target.value)} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="例: Sony ILCE-7RM4" />
                                <datalist id="camera-candidates">
                                    {exifSuggestions.models.map((m, i) => <option key={i} value={m} />)}
                                </datalist>
                            </div>
                            <div className="space-y-2">
                                <div className="flex gap-1.5">
                                    <input
                                        type="text"
                                        list="lens-candidates"
                                        value={lens}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setLens(val);
                                            // ✅ 入力完了時に履歴に保存
                                            if (val.length > 3) {
                                                setLensHistory(prev => {
                                                    const updated = [val, ...prev.filter(l => l !== val)].slice(0, 30);
                                                    try { localStorage.setItem(LENS_HISTORY_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
                                                    return updated;
                                                });
                                            }
                                        }}
                                        className="flex-1 border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="例: FE 35mm F1.4 GM"
                                    />
                                    <button
                                        type="button"
                                        title="Webで正式名称を検索"
                                        onClick={() => {
                                            const query = lens || 'カメラ レンズ';
                                            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
                                        }}
                                        className="px-2 bg-gray-50 border border-gray-200 rounded text-gray-400 hover:text-blue-500 hover:border-blue-200 transition-colors"
                                    >
                                        🌐
                                    </button>
                                </div>
                                <datalist id="lens-candidates">
                                    {/* ✅ EXIF履歴 + localStorage履歴をマージ。大文字小文字を無視して重複を完全に排除 */}
                                    {(() => {
                                        const combined = [...exifSuggestions.lensModels, ...lensHistory];
                                        const unique = [];
                                        const seenLower = new Set();
                                        for (const l of combined) {
                                            const lower = l.toLowerCase();
                                            if (!seenLower.has(lower)) {
                                                unique.push(l);
                                                seenLower.add(lower);
                                            }
                                        }
                                        return unique;
                                    })().map((l, i) => <option key={i} value={l} />)}
                                </datalist>
                                <div className="flex justify-between items-center mt-1">
                                    {lensHistory.length > 0 && (
                                        <p className="text-[10px] text-gray-400">💾 {lensHistory.length}件の履歴から候補選択可能</p>
                                    )}
                                    <p className="text-[10px] text-blue-500 font-bold ml-auto cursor-pointer hover:underline" onClick={() => window.open('/admin/profile', '_blank')}>📋 マスターを編集</p>
                                </div>
                            </div>
                        </div>

                        {/* ✅ 撮影データ（シャッタースピード分数入力対応） */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-gray-600">シャッタースピード</label>
                                <input
                                    type="text"
                                    value={shutter}
                                    onChange={e => setShutter(e.target.value)}
                                    className={`w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 text-sm ${shutter && !validateShutterSpeed(shutter) ? 'border-red-500 bg-red-50' : ''}`}
                                    placeholder="1/250"
                                />
                                <p className={`text-[10px] ${shutter && !validateShutterSpeed(shutter) ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                    形式: A/B または A (整数)
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-gray-600">絞り値</label>
                                <input
                                    type="text"
                                    list="aperture-list"
                                    value={aperture}
                                    onChange={e => setAperture(e.target.value)}
                                    className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="f/1.4"
                                />
                                <datalist id="aperture-list">
                                    {STANDARD_APERTURES
                                        .filter(val => parseFloat(val) >= getMinApertureFromLens(lens))
                                        .map(val => (
                                            <option key={val} value={val}>f/{val}</option>
                                        ))
                                    }
                                </datalist>
                                <p className="text-[10px] text-gray-400">例: 1.4, 2.8</p>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-gray-600">ISO</label>
                                <input
                                    type="text"
                                    value={iso}
                                    onChange={e => setIso(e.target.value)}
                                    className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="800"
                                />
                                <p className="text-[10px] text-gray-400">例: 100, 800, 3200</p>
                            </div>
                        </div>
                        {(shutter || aperture || iso) && (
                            <p className="text-[10px] text-blue-500 -mt-2">📷 EXIFから自動取得済（手動変更可）</p>
                        )}

                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-green-500" />
                                詳細な撮影地・住所入力
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-400 font-bold">郵便番号</p>
                                    <input type="text" value={addressZip} onChange={e => setAddressZip(e.target.value)} className="w-full border p-2 rounded text-sm" placeholder="100-0001" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-400 font-bold">都道府県</p>
                                    <input type="text" value={addressPref} onChange={e => setAddressPref(e.target.value)} className="w-full border p-2 rounded text-sm" placeholder="東京都" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase">規定住所一括入力 (Smart Parse)</p>
                                <textarea
                                    value={address}
                                    onChange={(e) => {
                                        const input = e.target.value;
                                        setAddress(input);
                                        const zipMatch = input.match(/(?:〒?\s?)(\d{3}-\d{4}|\d{7})/);
                                        const zip = zipMatch ? (zipMatch[1].includes('-') ? zipMatch[1] : `${zipMatch[1].slice(0, 3)}-${zipMatch[1].slice(3)}`) : '';
                                        if (zip) setAddressZip(zip);

                                        const prefMatch = input.match(/(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/);
                                        const pref = prefMatch ? prefMatch[1] : '';
                                        if (pref) setAddressPref(pref);

                                        let addr = input;
                                        if (zipMatch) addr = addr.replace(zipMatch[0], '');
                                        if (prefMatch) addr = addr.replace(prefMatch[0], '');
                                        addr = addr.replace(/^[\s　,]+|[\s　,]+$/g, '');
                                        if (addr) setAddressCity(addr);
                                    }}
                                    className="w-full border border-gray-200 bg-white rounded p-2 text-xs h-16 resize-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="例: 吉田学園 〒060-0063 北海道札幌市中央区 南3条西1丁目15"
                                />
                                <p className="text-[9px] text-amber-600 font-medium">※ 住所を貼り付けると郵便番号・都道府県・市区町村を自動抽出します。</p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-[10px] text-gray-400 font-bold">市区町村・番地・建物名</p>
                                <input type="text" value={addressCity} onChange={e => setAddressCity(e.target.value)} className="w-full border p-2 rounded text-sm" placeholder="千代田区千代田1-1" />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-600">座標 (緯度, 経度)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={coordsInput}
                                        onChange={e => setCoordsInput(e.target.value)}
                                        className="flex-1 border p-2 rounded text-sm font-mono"
                                        placeholder="35.6895, 139.6917"
                                    />
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            // 1. まず座標入力欄（北... 東... など）の解析を試みる
                                            if (coordsInput) {
                                                const parts = coordsInput.split(/[,，]/);
                                                if (parts.length >= 2) {
                                                    const parseCoord = (s: string, negChar: string) => {
                                                        const num = parseFloat(s.replace(/[^\d.-]/g, ''));
                                                        return s.includes(negChar) ? -Math.abs(num) : num;
                                                    };
                                                    const la = parseCoord(parts[0], '南');
                                                    const ln = parseCoord(parts[1], '西');
                                                    if (!isNaN(la) && !isNaN(ln)) {
                                                        const lat = la;
                                                        const lng = ln;
                                                        setLatitude(lat);
                                                        setLongitude(lng);
                                                        setCoordsInput(`${lat}, ${lng}`); // 正規化
                                                        return; // 解析できたら終了
                                                    }
                                                }
                                            }

                                            // 2. 検索実行
                                            const query = [addressZip, addressPref, addressCity].filter(Boolean).join(' ');
                                            if (!query) return;
                                            setSearchingLocation(true);
                                            setLocationCandidates([]);
                                            try {
                                                const { searchCoordinatesAction } = await import('@/lib/actions/photos');
                                                const results = await searchCoordinatesAction(query);

                                                if (results && results.length > 0) {
                                                    if (results.length === 1) {
                                                        const res = results[0];
                                                        setLatitude(res.lat);
                                                        setLongitude(res.lng);
                                                        setCoordsInput(`${res.lat}, ${res.lng}`);
                                                        if (res.displayName) {
                                                            setAddressDetail(prev => prev || res.displayName || '');
                                                        }
                                                    } else {
                                                        setLocationCandidates(results);
                                                    }
                                                } else {
                                                    alert('候補が見つかりませんでした。');
                                                }
                                            } catch (e) {
                                                console.error(e);
                                                alert('検索中にエラーが発生しました。');
                                            } finally {
                                                setSearchingLocation(false);
                                            }
                                        }}
                                        disabled={searchingLocation}
                                        className={`px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded text-xs font-bold hover:bg-blue-100 transition-colors ${searchingLocation ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {searchingLocation ? '検索中...' : '反映 & 座標取得'}
                                    </button>
                                </div>

                                {/* ✅ 候補リストの表示 */}
                                {locationCandidates.length > 0 && (
                                    <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-300 text-balance">
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
                                                        setLatitude(cand.lat);
                                                        setLongitude(cand.lng);
                                                        setCoordsInput(`${cand.lat}, ${cand.lng}`);
                                                        setAddressDetail(cand.displayName);
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
                                            className="w-full text-[10px] text-gray-400 hover:text-gray-600 py-1"
                                        >
                                            キャンセル
                                        </button>
                                    </div>
                                )}
                                <p className="text-[9px] text-gray-400">※ Googleマップ等の座標をそのまま貼り付け可能です。</p>
                            </div>

                            {/* ✅ マッププレビュー (Leaflet) */}
                            {latitude !== null && longitude !== null && (
                                <div className="mt-4 group/map relative">
                                    <LeafletMap
                                        lat={latitude}
                                        lng={longitude}
                                        height="300px"
                                        className="rounded-2xl overflow-hidden shadow-lg border border-gray-100"
                                    />
                                    <div className="absolute top-3 left-3 z-[1000] px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-xl text-[10px] font-bold text-gray-700 border border-gray-100 shadow-sm pointer-events-none flex items-center gap-1.5">
                                        <MapPin className="w-3 h-3 text-blue-500" />
                                        Batch Preview
                                    </div>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-bold text-blue-600 shadow-lg border border-blue-100 hover:bg-blue-50 transition-all transform hover:scale-105"
                                    >
                                        Google Maps で詳細を確認 ↗
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* ✅ 一括タグ付け */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700">一括タグ付け</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                    className="flex-1 border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="タグを入力してEnter"
                                />
                                <button type="button" onClick={addTag} className="px-3 py-2 bg-gray-100 text-gray-700 rounded border hover:bg-gray-200 text-sm font-bold">追加</button>
                            </div>
                            {batchTags && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {batchTags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                                        <span key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full border border-blue-200">
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => setBatchTags(batchTags.split(',').map(t => t.trim()).filter(t => t !== tag).join(', '))}
                                                className="text-blue-400 hover:text-blue-600"
                                            >×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            {uploadedFiles.some(f => f.tags && f.tags.length > 0) && (
                                <p className="text-[10px] text-purple-500">🤖 AIが自動タグを付与済み（上記タグと合算されます）</p>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-bold text-gray-700">共通撮影日</label>
                                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                                        <input type="checkbox" checked={!shotAtEnabled} onChange={(e) => setShotAtEnabled(!e.target.checked)} className="rounded" />
                                        撮影日なし
                                    </label>
                                </div>
                                <SmartDatePicker
                                    value={shotAt}
                                    onChange={(val) => setShotAt(val)}
                                    disabled={!shotAtEnabled}
                                    className="w-full"
                                />
                                {shotAtEnabled && camera && (
                                    <p className="text-[10px] text-blue-500">📷 EXIFから自動取得済み</p>
                                )}
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="block text-sm font-bold text-gray-700">共通SNS (URL or ID)</label>
                                <input type="text" value={snsUrl} onChange={(e) => setSnsUrl(e.target.value)} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500" placeholder="@username または URL" />
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={uploadedFiles.length === 0 || loading}
                                className="w-full bg-blue-600 text-white py-4 px-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98] text-lg"
                            >
                                {loading ? '一括保存中...' : `${uploadedFiles.length}枚の写真を一括保存する`}
                            </button>
                            <p className="text-[10px] text-gray-400 mt-2 text-center">
                                * 保存後、管理画面から一枚ずつ詳細を編集できます。
                            </p>
                        </div>
                    </form>
                </div>
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
                                                    {address || [addressPref, addressCity, addressDetail].filter(Boolean).join('') || '住所情報なし'}
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zip Code</span>
                                                    <p className="text-xs text-gray-800 font-mono font-bold">{addressZip || '-'}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prefecture</span>
                                                    <p className="text-xs text-gray-800 font-bold">{addressPref || '-'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {latitude !== null && longitude !== null && (
                                            <div className="w-full h-32 rounded-xl overflow-hidden border border-gray-100 shadow-inner">
                                                <LeafletMap
                                                    lat={latitude}
                                                    lng={longitude}
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
        </div>
    );
}
