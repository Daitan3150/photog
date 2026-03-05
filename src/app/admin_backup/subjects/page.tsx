'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/admin/AuthProvider';
import { getSubjects, saveSubject, updateSubject, deleteSubject, Subject } from '@/lib/actions/subjects';
import { Plus, Edit2, Trash2, X, ExternalLink, User } from 'lucide-react';

export default function SubjectsPage() {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [formData, setFormData] = useState({ name: '', snsUrl: '', notes: '' });
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        setLoading(true);
        const result = await getSubjects();
        if (result.success) {
            setSubjects(result.data);
        }
        setLoading(false);
    };

    const handleOpenModal = (subject: Subject | null = null) => {
        if (subject) {
            setEditingSubject(subject);
            setFormData({ name: subject.name, snsUrl: subject.snsUrl || '', notes: subject.notes || '' });
        } else {
            setEditingSubject(null);
            setFormData({ name: '', snsUrl: '', notes: '' });
        }
        setError('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSubject(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            setError('名前は必須です。');
            return;
        }

        setIsSaving(true);
        setError('');

        try {
            let result;
            if (editingSubject) {
                result = await updateSubject(editingSubject.id, formData);
            } else {
                result = await saveSubject(formData);
            }

            if (result.success) {
                await fetchSubjects();
                handleCloseModal();
            } else {
                setError(result.error || '保存中にエラーが発生しました。');
            }
        } catch (err: any) {
            setError(err.message || 'エラーが発生しました。');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`${name} を削除してもよろしいですか？この操作は取り消せません。`)) return;

        const result = await deleteSubject(id);
        if (result.success) {
            fetchSubjects();
        } else {
            alert(result.error || '削除中にエラーが発生しました。');
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-6xl mx-auto py-10 px-4 md:px-8">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">モデル管理</h1>
                    <p className="text-sm text-gray-500 mt-1">モデル（被写体）情報の登録とSNS連携を管理します。</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 active:scale-95"
                >
                    <Plus size={20} />
                    新規モデル登録
                </button>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
            ) : subjects.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <User className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-500 font-medium">登録されているモデルはいません。</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="mt-4 text-blue-600 font-bold hover:underline"
                    >
                        最初のモデルを登録する
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400">モデル名</th>
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400">SNS連携</th>
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400">メモ</th>
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {subjects.map((subject) => (
                                <tr key={subject.id} className="hover:bg-gray-50/30 transition-colors group">
                                    <td className="px-6 py-5">
                                        <span className="text-sm font-bold text-gray-900">{subject.name}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        {subject.snsUrl ? (
                                            <a
                                                href={subject.snsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium truncate max-w-[200px]"
                                            >
                                                {subject.snsUrl.replace(/^https?:\/\//, '')}
                                                <ExternalLink size={12} />
                                            </a>
                                        ) : (
                                            <span className="text-xs text-gray-400">未登録</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-xs text-gray-500 truncate max-w-[200px] block">{subject.notes || '-'}</span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenModal(subject)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="編集"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(subject.id, subject.name)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="削除"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <header className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingSubject ? 'モデル情報の編集' : '新規モデルの登録'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">名前 (必須)</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                    placeholder="モデル名を入力..."
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">SNS URL (任意)</label>
                                <input
                                    type="url"
                                    value={formData.snsUrl}
                                    onChange={(e) => setFormData({ ...formData, snsUrl: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                    placeholder="https://instagram.com/..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">メモ (任意)</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium h-24 resize-none"
                                    placeholder="撮影メモや特徴など..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full bg-blue-600 text-white py-4 rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50 mt-4 h-14"
                            >
                                {isSaving ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                                ) : (
                                    editingSubject ? '変更を保存する' : '新しく登録する'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
