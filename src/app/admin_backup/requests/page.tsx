'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { deletePhoto } from '@/lib/actions/photos';
import { onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function DeletionRequestsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push('/admin/login'); // Or just redirect to login
                return;
            }

            // Should verify admin role here too, but for now relying on layout/rules

            try {
                const q = query(
                    collection(db, 'photos'),
                    where('status', '==', 'delete_requested')
                );
                const querySnapshot = await getDocs(q);
                const fetchedRequests = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Sort manually by request time if available
                fetchedRequests.sort((a: any, b: any) =>
                    new Date(b.deleteRequestedAt || 0).getTime() - new Date(a.deleteRequestedAt || 0).getTime()
                );
                setRequests(fetchedRequests);
            } catch (error) {
                console.error("Error fetching requests:", error);
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleApprove = async (photoId: string) => {
        if (!confirm('本当に削除しますか？\nデータは完全に失われます。')) return;

        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Auth token missing');

            const result = await deletePhoto(photoId, token);

            if (result.success) {
                setRequests(requests.filter(r => r.id !== photoId));
                alert('削除を承認しました');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error("Error deleting photo:", error);
            alert('処理に失敗しました: ' + error.message);
        }
    };

    const handleReject = async (photoId: string) => {
        if (!confirm('削除申請を却下し、写真を元の状態に戻しますか？')) return;

        try {
            await updateDoc(doc(db, 'photos', photoId), {
                status: 'active', // Or whatever strict/default status you use
                deleteRequestedAt: null
            });
            setRequests(requests.filter(r => r.id !== photoId));
            alert('申請を却下しました（写真は復元されました）');
        } catch (error) {
            console.error("Error rejecting request:", error);
            alert('処理に失敗しました');
        }
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">削除依頼一覧</h1>

            {requests.length === 0 ? (
                <div className="bg-white p-10 rounded-lg shadow text-center text-gray-500">
                    現在、削除依頼はありません。
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {requests.map(req => (
                        <div key={req.id} className="bg-white rounded-lg shadow overflow-hidden border border-red-100">
                            <div className="relative aspect-video w-full bg-gray-100">
                                <Image
                                    src={req.url}
                                    alt={req.title || 'Request'}
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-lg mb-1">{req.title || '無題'}</h3>
                                <div className="text-sm text-gray-600 mb-2">
                                    <p>申請者: {req.userName || 'Unknown'}</p>
                                    <p>申請日: {req.deleteRequestedAt ? new Date(req.deleteRequestedAt).toLocaleString() : '不明'}</p>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => handleReject(req.id)}
                                        className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 transition text-sm font-bold"
                                    >
                                        却下 (復元)
                                    </button>
                                    <button
                                        onClick={() => handleApprove(req.id)}
                                        className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 transition text-sm font-bold"
                                    >
                                        承認 (削除)
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
