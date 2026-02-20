'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckSquare, Square, X, Check, Trash2, Camera } from 'lucide-react';
import { requestExifData } from '@/lib/actions/photos';

export default function MyPhotosPage() {
    const [photos, setPhotos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push('/admin/login');
                return;
            }
            setUser(currentUser);
            fetchUserPhotos(currentUser.uid);
        });
        return () => unsubscribe();
    }, [router]);

    const fetchUserPhotos = async (uid: string) => {
        try {
            const q = query(
                collection(db, 'photos'),
                where('uploaderId', '==', uid),
                where('status', '!=', 'delete_requested')
            );
            const querySnapshot = await getDocs(q);
            const userPhotos = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            userPhotos.sort((a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setPhotos(userPhotos);
        } catch (error) {
            console.error("Error fetching photos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRequest = async (photoId: string) => {
        if (!confirm('この写真の削除を申請しますか？\n管理者による承認後、完全に削除されます。\n申請後は一覧から非表示になります。')) return;

        try {
            const docRef = doc(db, 'photos', photoId);
            await updateDoc(docRef, {
                status: 'delete_requested',
                deleteRequestedAt: new Date().toISOString()
            });
            setPhotos(photos.filter(p => p.id !== photoId));
            alert('削除申請を行いました');
        } catch (error) {
            console.error("Error requesting deletion:", error);
            alert('申請に失敗しました');
        }
    };

    const handleRequestExif = async (photoId: string) => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const result = await requestExifData(photoId, token);
            if (result.success) {
                alert('機材情報の登録を管理者に依頼しました');
                setPhotos(photos.map(p => p.id === photoId ? { ...p, exifRequest: true } : p));
            } else {
                alert('依頼に失敗しました: ' + result.error);
            }
        } catch (error) {
            console.error("Error requesting EXIF:", error);
            alert('依頼に失敗しました');
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

    const handleBulkDeleteRequest = async () => {
        const count = selectedIds.size;
        if (!confirm(`${count}枚の写真の削除を一括申請しますか？\n申請後は一覧から非表示になります。`)) return;

        try {
            setLoading(true);
            const batch = writeBatch(db);
            const timestamp = new Date().toISOString();

            selectedIds.forEach(id => {
                const docRef = doc(db, 'photos', id);
                batch.update(docRef, {
                    status: 'delete_requested',
                    deleteRequestedAt: timestamp
                });
            });

            await batch.commit();
            setPhotos(photos.filter(p => !selectedIds.has(p.id)));
            setSelectedIds(new Set());
            setIsSelectionMode(false);
            alert(`${count}枚の削除申請を行いました`);
        } catch (error) {
            console.error("Error bulk requesting deletion:", error);
            alert('一括申請に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    if (loading && photos.length === 0) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 pb-24">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold">自分の写真一覧</h1>
                    <p className="text-sm text-gray-500 mt-1">投稿した写真の管理と削除申請ができます。</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            setIsSelectionMode(!isSelectionMode);
                            if (isSelectionMode) setSelectedIds(new Set());
                        }}
                        className={`text-sm px-4 py-2 rounded-full transition-all flex items-center gap-2 ${isSelectionMode
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'text-blue-600 hover:bg-blue-50'
                            }`}
                    >
                        {isSelectionMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                        {isSelectionMode ? 'キャンセル' : '複数選択'}
                    </button>
                    <Link
                        href="/dashboard"
                        className="text-gray-600 hover:text-gray-900 text-sm"
                    >
                        &larr; 戻る
                    </Link>
                </div>
            </div>

            {photos.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 mb-4 font-medium">まだ写真がありません</p>
                    <Link
                        href="/dashboard/photos/new"
                        className="bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                    >
                        写真を投稿する
                    </Link>
                </div>
            ) : (
                <>
                    {isSelectionMode && (
                        <div className="mb-6 bg-blue-50 p-4 rounded-xl flex items-center justify-between border border-blue-100">
                            <button
                                onClick={() => {
                                    if (selectedIds.size === photos.length) setSelectedIds(new Set());
                                    else setSelectedIds(new Set(photos.map(p => p.id)));
                                }}
                                className="text-sm font-bold text-blue-700 flex items-center gap-2"
                            >
                                {selectedIds.size === photos.length ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                すべて選択
                            </button>
                            <span className="text-sm font-bold text-blue-600">{selectedIds.size} 枚選択中</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {photos.map(photo => {
                            const isSelected = selectedIds.has(photo.id);
                            return (
                                <div
                                    key={photo.id}
                                    onClick={() => {
                                        if (isSelectionMode) {
                                            toggleSelection(photo.id);
                                        } else {
                                            router.push(`/dashboard/photos/${photo.id}`);
                                        }
                                    }}
                                    className={`bg-white rounded-xl shadow-sm overflow-hidden border transition-all cursor-pointer group relative ${isSelected ? 'ring-2 ring-blue-500 border-transparent scale-[0.98]' : 'border-gray-100'
                                        }`}
                                >
                                    {isSelectionMode && (
                                        <div className={`absolute top-3 left-3 z-10 p-1.5 rounded-lg shadow-sm transition-all ${isSelected ? 'bg-blue-500 text-white' : 'bg-white/90 text-gray-300 border border-gray-200'
                                            }`}>
                                            {isSelected ? <Check className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                        </div>
                                    )}

                                    <div className="relative aspect-[2/3]">
                                        <Image
                                            src={photo.url}
                                            alt={photo.title || 'Photo'}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <p className="font-bold truncate text-sm mb-1">{photo.title || '無題'}</p>
                                        <p className="text-[10px] text-gray-400 mb-4 tracking-tighter">
                                            {new Date(photo.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                        </p>
                                        {!isSelectionMode && (
                                            <div className="flex gap-2">
                                                <Link
                                                    href={`/dashboard/photos/${photo.id}`}
                                                    className="flex-1 text-center text-blue-600 text-[10px] font-bold border border-blue-100 rounded-md py-1.5 hover:bg-blue-50 transition"
                                                >
                                                    編集
                                                </Link>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteRequest(photo.id);
                                                    }}
                                                    className="flex-1 text-red-500 text-[10px] font-bold border border-red-100 rounded-md py-1.5 hover:bg-red-50 transition"
                                                >
                                                    削除申請
                                                </button>
                                            </div>
                                        )}
                                        {!isSelectionMode && !photo.exif && !photo.exifRequest && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRequestExif(photo.id);
                                                }}
                                                className="w-full mt-2 flex items-center justify-center gap-1 text-[9px] text-gray-500 hover:text-blue-600 transition-colors py-1 border border-dashed border-gray-200 rounded"
                                            >
                                                <Camera className="w-3 h-3" />
                                                機材情報の登録を依頼する
                                            </button>
                                        )}
                                        {!isSelectionMode && photo.exifRequest && !photo.exif && (
                                            <p className="mt-2 text-[9px] text-orange-500 text-center font-bold bg-orange-50 py-1 rounded">
                                                機材情報を依頼中...
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Floating Action Bar for Model */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-neutral-900 border border-neutral-800 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 backdrop-blur-md bg-opacity-90 min-w-[320px] justify-between">
                        <span className="font-bold text-sm whitespace-nowrap">
                            {selectedIds.size}枚を選択中
                        </span>
                        <div className="flex gap-4">
                            <button
                                onClick={handleBulkDeleteRequest}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-900/20"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                削除申請
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
