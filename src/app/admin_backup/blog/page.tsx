'use client';

import { useState, useEffect } from 'react';
import { getBlogs } from '@/lib/microcms';
import { deleteBlog } from '@/lib/actions/blog';
import Link from 'next/link';
import { Plus, Edit, Trash2, Calendar, FileText } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { useAuth } from '@/components/admin/AuthProvider';

export default function AdminBlogPage() {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            fetchPosts();
        }
    }, [user]);

    const fetchPosts = async () => {
        setLoading(true);
        const { contents } = await getBlogs({ limit: 100 });
        setPosts(contents);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('この記事を削除してもよろしいですか？')) return;

        const result = await deleteBlog(id);
        if (result.success) {
            fetchPosts();
        } else {
            alert('削除に失敗しました: ' + result.error);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">ブログ管理</h1>
                    <p className="text-gray-500 mt-1">記事の投稿・編集・削除を行います。</p>
                </div>
                <Link
                    href="/admin/blog/new"
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 font-bold shadow-lg shadow-blue-200"
                >
                    <Plus size={20} />
                    新規記事作成
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
            ) : posts.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="text-gray-400" size={32} />
                    </div>
                    <p className="text-gray-500 font-medium">まだ記事がありません。</p>
                    <Link href="/admin/blog/new" className="text-blue-600 font-bold mt-2 inline-block">最初の記事を書く</Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {posts.map((post: any) => (
                        <div key={post.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-6 group hover:shadow-md transition-shadow">
                            <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {post.eyecatch?.url ? (
                                    <Image src={post.eyecatch.url} alt={post.title} fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>
                                )}
                            </div>

                            <div className="flex-grow">
                                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                    <Calendar size={14} />
                                    {format(new Date(post.publishedAt || post.createdAt), 'yyyy/MM/dd')}
                                    {post.category && (
                                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold ml-2">
                                            {post.category.name}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                                    {post.title}
                                </h3>
                            </div>

                            <div className="flex items-center gap-2">
                                <Link
                                    href={`/admin/blog/${post.id}`}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    title="編集"
                                >
                                    <Edit size={20} />
                                </Link>
                                <button
                                    onClick={() => handleDelete(post.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="削除"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
