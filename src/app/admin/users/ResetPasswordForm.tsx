'use client';

import { useState } from 'react';
import { adminResetUserPassword } from '@/lib/actions/users';

export default function ResetPasswordForm({ userId, userEmail }: { userId: string, userEmail: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');
        if (password.length < 8) {
            setError('パスワードは8文字以上である必要があります。');
            return;
        }

        setLoading(true);
        try {
            const result = await adminResetUserPassword(userId, password);
            if (result.success) {
                setMessage('パスワードを正常に変更しました。');
                setPassword('');
            } else {
                setError(result.error || 'パスワード変更に失敗しました。');
            }
        } catch (err: any) {
            setError(err.message || '予期せぬエラーが発生しました。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative inline-block text-left">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-xs ml-2"
            >
                パスワード強制変更
            </button>
            
            {isOpen && (
                <div className="absolute right-0 z-10 mt-2 w-72 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none p-4">
                    <form onSubmit={handleReset}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {userEmail} の新しいパスワード
                        </label>
                        <input
                            type="text"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="新しいパスワード(8文字以上)"
                            className="w-full px-3 py-2 border rounded text-sm mb-2"
                            required
                            minLength={8}
                        />
                        {message && <p className="text-green-600 text-xs mb-2">{message}</p>}
                        {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="text-gray-500 text-xs hover:text-gray-700"
                            >
                                閉じる
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-red-600 text-white rounded px-3 py-1 text-xs hover:bg-red-700 disabled:opacity-50"
                            >
                                {loading ? '実行中...' : '変更する'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
