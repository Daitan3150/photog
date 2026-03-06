'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/admin/AuthProvider';
import { getPhotos, deletePhoto, bulkDeletePhotos, bulkUpdateCategory, refreshPhotoMetadata } from '@/lib/actions/photos';
import { getCategories, Category } from '@/lib/actions/categories';
import { Trash2, ExternalLink, CheckSquare, Square, X, Check, Tag, Edit, Loader2 } from 'lucide-react';
import Image from 'next/image';
import BulkEditModal from '@/components/admin/BulkEditModal';
import cloudinaryLoader from '@/lib/cloudinary-loader';

// 日付フォーマット（撮影日 or 追加日）
const formatDate = (dateString: string | null | undefined, fallback = '') => {
    if (!dateString) return fallback;
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(date);
    } catch {
        return fallback;
    }
};

export default function PhotosPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [photos, setPhotos] = useState<any[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true); // 初期ロード状態
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [bulkCategoryId, setBulkCategoryId] = useState('');
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [isExifSyncing, setIsExifSyncing] = useState(false);
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // 🔄 初期データの一括取得（最適化された Effect）
    useEffect(() => {
        let isMounted = true;

        async function initializeData() {
            if (!user) {
                if (isMounted) setLoading(false);
                return;
            }

            console.log('[PhotosPage] Initializing data for user:', user.email);
            if (isMounted) setLoading(true);

            try {
                const token = await user.getIdToken();
                console.log('[PhotosPage] ID Token obtained. Fetching data...');

                // カテゴリ取得 (失敗しても写真は表示できるようにする)
                let catData = [];
                try {
                    const catResult = await getCategories();
                    if (catResult && catResult.success) {
                        catData = catResult.data;
                        if (isMounted) setCategories(catData);
                    } else {
                        console.warn('[PhotosPage] Categories fetch failed:', catResult?.error);
                    }
                } catch (catErr: any) {
                    console.error('[PhotosPage] Category fetch error (skipping):', catErr.message);
                }

                // 写真取得
                try {
                    const photoResult = await getPhotos(token, { limit: 50 });
                    if (isMounted) {
                        if (photoResult && photoResult.photos) {
                            setPhotos(photoResult.photos);
                            setNextCursor(photoResult.nextCursor || null);
                            setHasMore(!!photoResult.nextCursor);
                        } else {
                            console.warn('[PhotosPage] Photos fetch failed or empty');
                            setPhotos([]);
                        }
                    }
                } catch (photoErr: any) {
                    console.error('[PhotosPage] Photo fetch error:', photoErr.message);
                    if (isMounted) {
                        setPhotos([]);
                        setError('写真の取得中にエラーが発生しました。');
                    }
                }
            } catch (err: any) {
                console.error('[PhotosPage] Initialization error:', err);
                if (isMounted) {
                    setPhotos([]);
                    setHasMore(false);
                }
            } finally {
                console.log('[PhotosPage] Initialization finished.');
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        initializeData();

        return () => {
            isMounted = false;
        };
    }, [user]);

    // 🔄 個別の「もっと見る」または「リロード」処理
    const fetchPhotos = async (reset = false) => {
        if (!user) return;

        try {
            if (reset) setLoading(true);
            else setLoadingMore(true);

            const token = await user.getIdToken();
            const currentCursor = reset ? undefined : (nextCursor || undefined);

            const result = await getPhotos(token, { limit: 50, cursor: currentCursor });

            if (result && result.photos) {
                if (reset) {
                    setPhotos(result.photos);
                } else {
                    setPhotos(prev => [...prev, ...result.photos]);
                }
                setNextCursor(result.nextCursor || null);
                setHasMore(!!result.nextCursor);
            } else if (reset) {
                setPhotos([]);
                setHasMore(false);
            }
        } catch (err) {
            console.error('[PhotosPage] fetchPhotos error:', err);
            if (reset) setPhotos([]);
            setHasMore(false);
        } finally {
            if (reset) setLoading(false);
            else setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!loadingMore) fetchPhotos(false);
    };

    // リストの完全リロード（一括操作後など）
    const reloadList = () => {
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        fetchPhotos(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('本当にこの写真を削除しますか？この操作は取り消せません。')) return;
        if (!user) return;

        // Optimistic UI update
        const prevPhotos = [...photos];
        setPhotos(photos.filter(p => p.id !== id));

        const token = await user.getIdToken();
        const result = await deletePhoto(id, token);
        if (!result.success) {
            alert('削除に失敗しました: ' + result.error);
            setPhotos(prevPhotos); // Revert
        }
    };

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedIds(newSelection);
        if (newSelection.size > 0) setIsSelectionMode(true);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === photos.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(photos.map(p => p.id)));
        }
    };

    const handleBulkDelete = async () => {
        const count = selectedIds.size;
        if (!confirm(`${count}枚の写真を一括削除しますか？\nこの操作は取り消せません。`)) return;
        if (!user) return;

        // Optimistic UI Update not easily done for bulk, show loading
        setLoading(true); // Re-use main loader or bulk loader
        const token = await user.getIdToken();
        const result = await bulkDeletePhotos(Array.from(selectedIds), token);
        if (result.success) {
            alert(`${result.success}枚の写真を削除しました。`);
            reloadList();
        } else {
            alert('一括削除に失敗しました: ' + result.error);
            setLoading(false);
        }
    };

    const handleBulkCategoryUpdate = async () => {
        if (!user) return;
        const count = selectedIds.size;
        const catName = bulkCategoryId
            ? (categories.find(c => c.id === bulkCategoryId)?.name || bulkCategoryId)
            : '未設定';
        if (!confirm(`${count}枚の写真のカテゴリーを「${catName}」に変更しますか？`)) return;

        setIsBulkUpdating(true);
        const token = await user.getIdToken();
        const result = await bulkUpdateCategory(Array.from(selectedIds), bulkCategoryId, token);
        if (result.success) {
            alert(`${result.count}枚のカテゴリーを更新しました。`);
            reloadList();
            setBulkCategoryId('');
        } else {
            alert('一括更新に失敗しました: ' + result.error);
        }
        setIsBulkUpdating(false);
    };

    const handleBulkExifSync = async () => {
        if (!user) return;
        const count = selectedIds.size;
        if (!confirm(`${count}枚の写真のEXIF情報をCloudinaryから再取得しますか？\n既存のEXIF情報は上書きされます。`)) return;

        setIsExifSyncing(true);
        const token = await user.getIdToken();
        const ids = Array.from(selectedIds);

        let successCount = 0;
        let failCount = 0;

        // Process sequentially to avoid rate limits
        for (const id of ids) {
            const result = await refreshPhotoMetadata(id, token);
            if (result.success) successCount++;
            else failCount++;
        }

        alert(`EXIF同期完了: 成功 ${successCount}件 / 失敗 ${failCount}件`);
        reloadList();
        setIsExifSyncing(false);
    };

    // カテゴリー名を ID から取得
    const getCategoryName = (categoryId: string | null) => {
        if (!categoryId) return null;
        return categories.find(c => c.id === categoryId)?.name || categoryId;
    };

    return (
        <div className="pb-32">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">写真管理</h1>
                    <p className="text-gray-500">ポートフォリオの写真を管理します。</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setIsSelectionMode(!isSelectionMode);
                            if (isSelectionMode) setSelectedIds(new Set());
                        }}
                        className={`px-4 py-2 rounded flex items-center gap-2 font-bold shadow-md transition-all ${isSelectionMode
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        {isSelectionMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                        {isSelectionMode ? '選択解除' : '複数選択'}
                    </button>
                    <Link
                        href="/admin/photos/new"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2 font-bold shadow-md transition-transform hover:-translate-y-0.5"
                    >
                        <span>+</span> 新規投稿
                    </Link>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-between">
                    <p className="text-sm font-medium">{error}</p>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                        <X size={16} />
                    </button>
                </div>
            )}

            {loading ? (
                <div className="text-center py-20 text-gray-500">読み込み中...</div>
            ) : photos.length === 0 ? (
                <div className="bg-white p-12 rounded-lg shadow-sm text-center text-gray-500 border-2 border-dashed border-gray-200">
                    <p className="text-xl mb-4">写真が見つかりません。</p>
                    <p>「新規写真の投稿」ボタンから写真を追加してください。</p>
                </div>
            ) : (() => {
                // カテゴリーごとにグループ化
                const uncategorized = photos.filter(p => !p.categoryId || String(p.categoryId).trim() === '');
                const categorized = photos.filter(p => p.categoryId && String(p.categoryId).trim() !== '');
                const groupedByCategory: Record<string, any[]> = {};
                categorized.forEach(p => {
                    const catName = getCategoryName(p.categoryId) || p.categoryId;
                    if (!groupedByCategory[catName]) groupedByCategory[catName] = [];
                    groupedByCategory[catName].push(p);
                });
                const categoryNames = Object.keys(groupedByCategory).sort();

                const renderPhotoCard = (photo: any) => {
                    const isSelected = selectedIds.has(photo.id);
                    const catName = getCategoryName(photo.categoryId);
                    return (
                        <div
                            key={photo.id}
                            onClick={() => {
                                if (isSelectionMode) {
                                    toggleSelection(photo.id);
                                } else {
                                    router.push(`/admin/photos/${photo.id}`);
                                }
                            }}
                            className={`bg-white rounded-xl shadow-sm overflow-hidden border transition-all cursor-pointer group relative ${isSelected ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-100 hover:shadow-md'
                                }`}
                        >
                            {isSelectionMode && (
                                <div className={`absolute top-3 left-3 z-10 p-1 rounded-md transition-colors ${isSelected ? 'bg-blue-500 text-white' : 'bg-white/80 text-gray-400 border border-gray-200'
                                    }`}>
                                    {isSelected ? <Check className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                </div>
                            )}

                            {catName && (
                                <div className="absolute top-3 right-3 z-10">
                                    <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                                        {catName}
                                    </span>
                                </div>
                            )}

                            <div className="relative aspect-[3/2] bg-gray-100">
                                <Image
                                    loader={cloudinaryLoader}
                                    src={photo.url}
                                    alt={photo.title || 'Untitled'}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                                {!isSelectionMode && (
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                        {photo.snsUrl && (
                                            <a
                                                href={photo.snsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-3 bg-white/90 backdrop-blur-sm shadow-xl rounded-full text-blue-500 hover:text-blue-600 hover:scale-110 transition-all"
                                                onClick={(e) => e.stopPropagation()}
                                                title="SNSリンクを開く"
                                            >
                                                <ExternalLink className="w-5 h-5" />
                                            </a>
                                        )}
                                        <div className="p-3 bg-white/90 backdrop-blur-sm shadow-xl rounded-full text-gray-700 hover:text-blue-600 hover:scale-110 transition-all font-bold flex items-center gap-2">
                                            <Edit className="w-5 h-5" />
                                            <span className="text-sm">編集</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-lg truncate flex-1" title={photo.title || '見出し未設定'}>
                                        {photo.title || <span className="text-gray-300 font-normal italic">見出し未設定</span>}
                                    </h3>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-sm text-gray-600">
                                        <p className="font-medium text-pink-600">{photo.subjectName || <span className="opacity-0">-</span>}</p>
                                        <p className="text-xs text-gray-400 mt-1">{photo.location || <span className="opacity-0">-</span>}</p>
                                    </div>
                                    <div className="text-right text-xs text-gray-400 font-mono space-y-0.5">
                                        {photo.shotAt && (
                                            <p title="撮影日">📷 {formatDate(photo.shotAt)}</p>
                                        )}
                                        {photo.createdAt && (
                                            <p title="追加日" className="text-gray-300">
                                                ＋{formatDate(photo.createdAt)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {!isSelectionMode && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(photo.id);
                                            }}
                                            className="text-xs flex items-center gap-1.5 text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
                                            title="写真を削除"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            削除
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                };

                return (
                    <>
                        {isSelectionMode && (
                            <div className="mb-4 flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-sm font-medium text-blue-700 hover:text-blue-800 flex items-center gap-2"
                                    >
                                        {selectedIds.size === photos.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                        すべて選択
                                    </button>
                                    <span className="text-sm text-blue-600 font-bold">{selectedIds.size} 枚選択中</span>
                                </div>
                            </div>
                        )}

                        {/* サマリーバー */}
                        <div className="mb-6 flex flex-wrap gap-3">
                            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-600">
                                全 <span className="font-bold text-gray-900">{photos.length}</span> 枚
                            </div>
                            {uncategorized.length > 0 && (
                                <button
                                    onClick={() => document.getElementById('section-uncategorized')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm font-bold text-red-600 flex items-center gap-2 hover:bg-red-100 transition-colors cursor-pointer"
                                >
                                    ⚠️ 未分類 <span className="bg-red-100 px-2 py-0.5 rounded-full text-red-700">{uncategorized.length}枚</span>
                                </button>
                            )}
                            {categoryNames.map(catName => (
                                <button
                                    key={catName}
                                    onClick={() => document.getElementById(`section-${catName}`)?.scrollIntoView({ behavior: 'smooth' })}
                                    className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    {catName} <span className="font-bold text-gray-900">{groupedByCategory[catName].length}</span>
                                </button>
                            ))}
                        </div>

                        {/* 🚨 未分類の写真（最上部に大きく警告表示） */}
                        {
                            uncategorized.length > 0 && (
                                <div className="mb-10" id="section-uncategorized">
                                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-xl">⚠️</div>
                                            <div>
                                                <h2 className="text-xl font-bold text-red-700">カテゴリー未設定の写真</h2>
                                                <p className="text-sm text-red-500">
                                                    以下の <span className="font-bold">{uncategorized.length}枚</span> はカテゴリーが未設定のため、ポートフォリオに公開されません。
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-red-400 mt-2">
                                            写真をクリックして編集画面からカテゴリーを設定するか、複数選択で一括カテゴリー変更ができます。
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {uncategorized.map(renderPhotoCard)}
                                    </div>
                                </div>
                            )
                        }

                        {/* カテゴリーごとのセクション */}
                        {
                            categoryNames.map(catName => (
                                <div key={catName} className="mb-10" id={`section-${catName}`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wider">{catName}</h2>
                                        <span className="text-sm text-gray-400 font-medium">{groupedByCategory[catName].length}枚</span>
                                        <div className="h-[1px] flex-1 bg-gray-200" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {groupedByCategory[catName].map(renderPhotoCard)}
                                    </div>
                                </div>
                            ))
                        }

                        {
                            hasMore && (
                                <div className="mt-8 text-center pb-8">
                                    <button
                                        onClick={handleLoadMore}
                                        disabled={loadingMore}
                                        className="px-6 py-3 bg-white border border-gray-200 rounded-full shadow-sm text-gray-600 font-bold hover:bg-gray-50 hover:shadow-md transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
                                    >
                                        {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {loadingMore ? '読み込み中...' : 'もっと見る'}
                                    </button>
                                </div>
                            )
                        }
                    </>
                );
            })()}

            {/* Floating Action Bar（選択中に表示） */}
            {
                selectedIds.size > 0 && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-neutral-900 border border-neutral-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-4 backdrop-blur-md bg-opacity-90 min-w-[340px]">
                            <span className="font-bold text-sm border-b sm:border-b-0 sm:border-r border-neutral-700 pb-2 sm:pb-0 sm:pr-6 sm:mr-2 w-full sm:w-auto text-center sm:text-left">
                                {selectedIds.size}枚選択中
                            </span>

                            {/* 一括カテゴリー変更 */}
                            <div className="flex items-center gap-2 flex-1">
                                <Tag className="w-4 h-4 text-blue-400 shrink-0" />
                                <select
                                    value={bulkCategoryId}
                                    onChange={(e) => setBulkCategoryId(e.target.value)}
                                    className="flex-1 bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">カテゴリーを選択...</option>
                                    <option value="">── 未設定にする ──</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleBulkCategoryUpdate}
                                    disabled={isBulkUpdating}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shrink-0"
                                >
                                    <Check className="w-4 h-4" />
                                    {isBulkUpdating ? '更新中...' : '適用'}
                                </button>
                            </div>

                            {/* EXIF Sync Button */}
                            <button
                                onClick={handleBulkExifSync}
                                disabled={isExifSyncing}
                                className="bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                title="CloudinaryからEXIF情報を再取得"
                            >
                                <span className="text-xs">EXIF同期</span>
                            </button>

                            {/* Bulk Edit Button */}
                            <button
                                onClick={() => setIsBulkEditModalOpen(true)}
                                className="bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                                title="一括編集 (モデル名・場所など)"
                            >
                                <Edit className="w-4 h-4" />
                                <span className="text-xs hidden sm:inline">編集</span>
                            </button>

                            {/* 一括削除 */}
                            <div className="flex gap-3 items-center">
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    クリア
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-900/20"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    削除
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Bulk Edit Modal */}
            <BulkEditModal
                isOpen={isBulkEditModalOpen}
                onClose={() => setIsBulkEditModalOpen(false)}
                selectedIds={selectedIds}
                onUpdateComplete={() => {
                    reloadList();
                    setIsBulkEditModalOpen(false);
                }}
            />
        </div >
    );
}
