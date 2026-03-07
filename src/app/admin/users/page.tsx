import { getUsers } from '@/lib/actions/users';
import Link from 'next/link';
import ResetPasswordForm from './ResetPasswordForm';
import DeleteUserButton from './DeleteUserButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function UsersPage() {
    const { success, users, error } = await getUsers();

    if (!success || !users) {
        return (
            <div className="p-8 text-red-500">
                Error loading users: {error}
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">ユーザー管理</h1>
                    <p className="text-gray-500 mt-1">
                        現在 {users.length} 名のモデル・レイヤーが登録されています。
                    </p>
                </div>
                <Link
                    href="/admin/invite"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <span>💌</span>
                    <span>招待コード発行</span>
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ユーザー</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">メールアドレス</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">モデルID</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">投稿写真数</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">登録日</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">最終ログイン</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map((user: any) => (
                            <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-lg overflow-hidden">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                            ) : (
                                                user.displayName.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900">{user.displayName}</div>
                                            <div className="text-xs text-gray-400">UID: {user.uid.slice(0, 8)}...</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {user.email}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                        {user.modelId || 'N/A'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.photoCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {user.photoCount} 枚
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('ja-JP') : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 items-center">
                                        <ResetPasswordForm userId={user.uid} userEmail={user.email || ''} />
                                        <DeleteUserButton userId={user.uid} userEmail={user.email || ''} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
