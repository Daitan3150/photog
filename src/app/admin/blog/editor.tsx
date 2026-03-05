'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createBlog, updateBlog, getCategories } from '@/lib/actions/blog';
import { getBlogDetail } from '@/lib/microcms';
import { ArrowLeft, Save, Image as ImageIcon, Type, Layout, Tag } from 'lucide-react';
import Link from 'next/link';

export default function BlogEditorPage({ params }: { params?: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = params ? use(params) : null;
    const isEdit = !!resolvedParams?.id;

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        categoryId: '',
        eyecatchUrl: ''
    });

    useEffect(() => {
        const load = async () => {
            const cats = await getCategories();
            setCategories(cats);

            if (isEdit && resolvedParams?.id) {
                try {
                    const post = await getBlogDetail(resolvedParams.id);
                    setFormData({
                        title: post.title,
                        content: post.content,
                        categoryId: post.category?.id || '',
                        eyecatchUrl: post.eyecatch?.url || ''
                    });
                } catch (error) {
                    console.error('Fetch post error:', error);
                    alert('記事の読み込みに失敗しました');
                }
                setLoading(false);
            }
        };
        load();
    }, [isEdit, resolvedParams?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const result = isEdit
            ? await updateBlog(resolvedParams!.id, formData)
            : await createBlog(formData);

        if (result.success) {
            router.push('/admin/blog');
            router.refresh();
        } else {
            alert('保存に失敗しました: ' + result.error);
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center">読み込み中...</div>;

    return (
        <div className="max-w-4xl mx-auto py-8">
            <Link href="/admin/blog" className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-8 transition-colors">
                <ArrowLeft size={18} className="mr-2" />
                ブログ一覧に戻る
            </Link>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                <div className="p-8 md:p-12">
                    <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                        {isEdit ? '記事を編集' : '新しい記事を書く'}
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="flex items-center text-sm font-bold text-gray-700">
                                <Type size={16} className="mr-2 text-blue-500" />
                                タイトル
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full border-gray-200 border rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg font-medium"
                                placeholder="記事のタイトルを入力..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="flex items-center text-sm font-bold text-gray-700">
                                    <Tag size={16} className="mr-2 text-teal-500" />
                                    カテゴリー
                                </label>
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    className="w-full border-gray-200 border rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none bg-white"
                                >
                                    <option value="">カテゴリーを選択...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center text-sm font-bold text-gray-700">
                                    <ImageIcon size={16} className="mr-2 text-pink-500" />
                                    アイキャッチ画像URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.eyecatchUrl}
                                    onChange={(e) => setFormData({ ...formData, eyecatchUrl: e.target.value })}
                                    className="w-full border-gray-200 border rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="https://images.microcms-assets.io/..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center text-sm font-bold text-gray-700">
                                <Layout size={16} className="mr-2 text-purple-500" />
                                本文 (HTMLが使用できます)
                            </label>
                            <textarea
                                required
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                rows={15}
                                className="w-full border-gray-200 border rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm leading-relaxed"
                                placeholder="<p>ここに記事の本文を入力します。</p>"
                            />
                        </div>

                        <div className="pt-6 flex gap-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="flex-1 px-6 py-4 border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-all"
                            >
                                キャンセル
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-[2] bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Save size={20} />
                                {saving ? '保存中...' : '公開する'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
