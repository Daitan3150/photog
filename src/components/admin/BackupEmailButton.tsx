'use client';

import { useState } from 'react';
import { sendBackupEmail } from '@/lib/actions/email';

export default function BackupEmailButton() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSend = async () => {
        if (!email) return;
        setLoading(true);
        setMessage('');

        try {
            const result = await sendBackupEmail(email);

            if (result.success) {
                setMessage('✅ 送信しました！メールボックスを確認してください。');
                setEmail('');
            } else {
                console.error(result.error);
                setMessage(`❌ エラー: ${result.error}`);
            }
        } catch (e: any) {
            console.error(e);
            setMessage(`❌ 送信中にエラーが発生しました: ${e.message}`);
        }
        setLoading(false);
    };

    return (
        <div className="border p-6 rounded-lg hover:bg-gray-50 transition shadow-sm hover:shadow-md bg-white">
            <div className="text-4xl mb-3">📧</div>
            <h3 className="text-xl font-bold mb-2">バックアップ送信</h3>
            <p className="text-gray-500 mb-4 text-sm">ポートフォリオのURLや設定情報をメールで送信します。</p>

            <div className="flex flex-col gap-2">
                <input
                    type="email"
                    placeholder="送信先メールアドレス"
                    className="border p-2 rounded text-sm w-full"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <button
                    onClick={handleSend}
                    disabled={loading || !email}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-bold text-sm w-full disabled:opacity-50 transition-colors"
                >
                    {loading ? '送信中...' : '情報をメールで送る'}
                </button>
                {message && <p className="text-xs font-bold mt-2 text-gray-700">{message}</p>}
            </div>
        </div>
    );
}
