'use client';

import { useState } from 'react';
import { removeUser } from '@/lib/actions/invitation';
import { useAuth } from '@/components/admin/AuthProvider';
import { Trash2, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DeleteUserButton({ userId, userEmail, onDeleted }: { userId: string, userEmail: string, onDeleted?: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { user, role } = useAuth();

    // Only show for admins (super admins are checked server-side)
    if (role !== 'admin') return null;

    const handleDelete = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const idToken = await user.getIdToken();
            const result = await removeUser(userId, idToken);
            if (result.success) {
                setIsOpen(false);
                if (onDeleted) onDeleted();
                else window.location.reload();
            } else {
                alert('削除に失敗しました: ' + result.error);
            }
        } catch (err: any) {
            alert('削除エラー: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="ユーザー削除"
            >
                <Trash2 size={18} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />

                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
                                    <AlertCircle size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">ユーザーの削除</h3>
                                    <p className="text-sm text-gray-500 mt-1">この操作は完全に元に戻せません。</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4 mb-8">
                                <p className="text-sm text-gray-600 font-medium">対象ユーザー:</p>
                                <p className="text-lg font-mono font-bold text-gray-900 mt-1">{userEmail}</p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold transition-all"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="flex-1 py-4 px-6 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        '完全に削除'
                                    )}
                                </button>
                            </div>

                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"
                            >
                                <X size={20} />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
