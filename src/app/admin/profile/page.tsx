'use client';

import { useState, useEffect } from 'react';
import { Profile } from '@/lib/firebase/profile';
import { updateProfile, getProfileServer } from '@/lib/actions/profile';
import { getMyProfile, updateMySnsLinks, SnsLink } from '@/lib/actions/users';
import { CldUploadWidget } from 'next-cloudinary';
import { useAuth } from '@/components/admin/AuthProvider';

const initialProfile: Profile = {
    name: '',
    role: '',
    location: '',
    bio: '',
    gear: [],
    mainGear: [],
    subGear: [],
    lenses: [],
    imageUrl: '',
};

export default function AdminProfilePage() {
    const { user, role } = useAuth();
    const [profile, setProfile] = useState<Profile>(initialProfile);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mySnsLinks, setMySnsLinks] = useState<SnsLink[]>([]);
    const [message, setMessage] = useState('');
    const isAdmin = role === 'admin';

    useEffect(() => {
        const fetchAllData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const idToken = await user.getIdToken();
                const [siteProfile, myData] = await Promise.all([
                    getProfileServer(),
                    getMyProfile(idToken)
                ]);

                if (siteProfile.success && siteProfile.data) {
                    setProfile(siteProfile.data);
                }
                if (myData.success && myData.data) {
                    setMySnsLinks(myData.data.snsLinks || []);
                }
            } catch (error) {
                console.error('Error fetching profile data:', error);
            }
            setLoading(false);
        };
        fetchAllData();
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleGearChange = (category: 'mainGear' | 'subGear' | 'lenses' | 'otherGear') => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setProfile({ ...profile, [category]: e.target.value.split('\n') });
    };

    const handleLegacyGearChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setProfile({ ...profile, gear: e.target.value.split('\n') });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        setMessage('');

        try {
            const idToken = await user.getIdToken();
            const results = [];

            if (isAdmin) {
                results.push(await updateProfile(profile, idToken));
            }

            // Everyone can update their own SNS links
            results.push(await updateMySnsLinks(mySnsLinks.filter(l => l.value.trim() !== ''), idToken));

            const allSuccess = results.every(r => r.success);
            if (allSuccess) {
                setMessage('✅ 設定を保存しました');
            } else {
                const errors = results.filter(r => !r.success).map(r => r.error).join(', ');
                setMessage('❌ 保存に失敗しました: ' + (errors || 'Unknown error'));
            }
        } catch (error: any) {
            console.error(error);
            setMessage('❌ エラーが発生しました');
        }
        setSaving(false);
    };

    const addSnsLink = () => setMySnsLinks([...mySnsLinks, { type: 'X', value: '' }]);
    const removeSnsLink = (index: number) => setMySnsLinks(mySnsLinks.filter((_, i) => i !== index));
    const updateSnsLink = (index: number, key: keyof SnsLink, val: string) => {
        const newLinks = [...mySnsLinks];
        (newLinks[index] as any)[key] = val;
        setMySnsLinks(newLinks);
    };

    if (loading) return <div className="p-8">読み込み中...</div>;

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <h1 className="text-2xl font-bold mb-6">プロフィール編集</h1>

            <form onSubmit={handleSave} className="space-y-8">

                {/* Site Profile Settings - Admin Only */}
                {isAdmin && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-8">
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-xl font-bold text-gray-800">サイト表示設定</h2>
                            <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Admin Only</span>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-700">サイト用プロフィール画像</label>
                            <div className="flex items-start gap-6">
                                {profile.imageUrl && (
                                    <img src={profile.imageUrl} alt="Profile" className="w-24 h-24 object-cover rounded-full border shadow-sm" />
                                )}
                                <CldUploadWidget
                                    uploadPreset="profile_preset"
                                    onSuccess={(result: any) => {
                                        setProfile(prev => ({ ...prev, imageUrl: result.info.secure_url }));
                                    }}
                                >
                                    {({ open }) => (
                                        <button type="button" onClick={() => open()} className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 text-sm font-bold hover:bg-gray-100 transition">
                                            画像をアップロード
                                        </button>
                                    )}
                                </CldUploadWidget>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-50">
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700">管理者 SNS リンク (サイト全体用)</label>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                        <div className="w-8 h-8 flex items-center justify-center text-gray-500">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z" /></svg>
                                        </div>
                                        <input
                                            type="url"
                                            name="xUrl"
                                            value={profile.xUrl || ''}
                                            onChange={handleChange}
                                            className="flex-grow bg-transparent outline-none text-sm"
                                            placeholder="https://x.com/your-id"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                        <div className="w-8 h-8 flex items-center justify-center text-pink-500">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><circle cx="12" cy="12" r="3" /><path d="M16.5 7.5l.01-.01" /></svg>
                                        </div>
                                        <input
                                            type="url"
                                            name="instagramUrl"
                                            value={profile.instagramUrl || ''}
                                            onChange={handleChange}
                                            className="flex-grow bg-transparent outline-none text-sm"
                                            placeholder="https://instagram.com/your-id"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400">※ フッターのアイコンにリンクされます</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-50">
                            <div className="space-y-4">
                                <h3 className="font-bold text-blue-600 flex items-center gap-2">🇯🇵 日本語表示</h3>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500">肩書き</label>
                                    <input type="text" name="roleJa" value={profile.roleJa || ''} onChange={handleChange} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" placeholder="フォトグラファー" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500">活動拠点</label>
                                    <input type="text" name="locationJa" value={profile.locationJa || ''} onChange={handleChange} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" placeholder="北海道 札幌市" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500">自己紹介</label>
                                    <textarea name="bioJa" value={profile.bioJa || ''} onChange={handleChange} className="w-full border p-2.5 rounded-xl bg-gray-50 h-32 outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-blue-600 flex items-center gap-2">🇺🇸 English Display</h3>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500">Role</label>
                                    <input type="text" name="roleEn" value={profile.roleEn || ''} onChange={handleChange} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Photographer" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500">Location</label>
                                    <input type="text" name="locationEn" value={profile.locationEn || ''} onChange={handleChange} className="w-full border p-2.5 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Hokkaido, Sapporo" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500">Bio</label>
                                    <textarea name="bioEn" value={profile.bioEn || ''} onChange={handleChange} className="w-full border p-2.5 rounded-xl bg-gray-50 h-32 outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-50">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">メイン機材 (Main Gear)</label>
                                    <textarea
                                        value={(profile.mainGear || []).join('\n')}
                                        onChange={handleGearChange('mainGear')}
                                        className="w-full border p-2.5 rounded-xl bg-gray-50 h-24 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="メインカメラなどを改行で入力..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">サブ機材 (Sub Gear)</label>
                                    <textarea
                                        value={(profile.subGear || []).join('\n')}
                                        onChange={handleGearChange('subGear')}
                                        className="w-full border p-2.5 rounded-xl bg-gray-50 h-24 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="サブ機材を改行で入力..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">レンズ (Lenses)</label>
                                    <textarea
                                        value={(profile.lenses || []).join('\n')}
                                        onChange={handleGearChange('lenses')}
                                        className="w-full border p-2.5 rounded-xl bg-gray-50 h-[100px] outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="使用レンズを改行で入力..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">その他 (Other Gear)</label>
                                    <textarea
                                        value={(profile.otherGear || []).join('\n')}
                                        onChange={handleGearChange('otherGear')}
                                        className="w-full border p-2.5 rounded-xl bg-gray-50 h-[100px] outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="照明、三脚などを改行で入力..."
                                    />
                                </div>
                            </div>
                        </div>

                        <details className="pt-4 border-t border-gray-50 opacity-40">
                            <summary className="text-xs font-bold text-gray-400 cursor-pointer">旧機材データ（互換用）</summary>
                            <div className="mt-2 space-y-2">
                                <textarea
                                    value={(profile.gear || []).join('\n')}
                                    onChange={handleLegacyGearChange}
                                    className="w-full border p-2.5 rounded-xl bg-gray-50 h-20 outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                                    placeholder="旧機材データ..."
                                />
                            </div>
                        </details>
                    </div>
                )}

                {/* Individual SNS Registry - For Everyone */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-xl font-bold text-purple-600">SNS連携設定</h2>
                        <span className="bg-purple-100 text-purple-600 text-[10px] px-2 py-0.5 rounded-full font-bold">自動反映用</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-6">ここに登録しておくと、写真投稿時にSNS情報が自動で反映されます。URLまたはID形式どちらでもOKです。</p>

                    <div className="space-y-4">
                        {mySnsLinks.map((link, index) => (
                            <div key={index} className="flex flex-col sm:flex-row gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100 relative group">
                                <div className="w-full sm:w-40">
                                    <select
                                        value={link.type}
                                        onChange={(e) => updateSnsLink(index, 'type', e.target.value)}
                                        className="w-full border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                                    >
                                        <option value="X">X (Twitter)</option>
                                        <option value="Instagram">Instagram</option>
                                        <option value="TikTok">TikTok</option>
                                        <option value="Threads">Threads</option>
                                        <option value="YouTube">YouTube</option>
                                        <option value="Other">その他</option>
                                    </select>
                                </div>
                                <div className="flex-grow flex gap-2">
                                    <input
                                        type="text"
                                        value={link.value}
                                        onChange={(e) => updateSnsLink(index, 'value', e.target.value)}
                                        className="flex-grow border p-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                        placeholder={link.type === 'Other' ? 'URL/IDを入力' : `@username または URL`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeSnsLink(index)}
                                        className="text-gray-400 hover:text-red-500 p-2 rounded-lg transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={addSnsLink}
                        className="mt-6 w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 transition-all font-bold flex items-center justify-center gap-2"
                    >
                        <span>+</span> SNSリンクを追加
                    </button>
                </div>

                {/* Account Withdrawal - Warning Section */}
                {!isAdmin && (
                    <div className="bg-red-50/50 p-8 rounded-2xl border border-red-100 flex flex-col mt-8">
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-xl font-bold text-red-600">退会手続き</h2>
                            <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">CAUTION</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                            アカウントを削除すると、ログインができなくなります。<br />
                            また、あなたが投稿した写真は<strong>自動的に「アーカイブ（非公開）」</strong>に移動されます。
                        </p>

                        <button
                            type="button"
                            onClick={async () => {
                                if (confirm('本当に退会しますか？\nこの操作は取り消せません。投稿した写真はアーカイブに移動されます。')) {
                                    try {
                                        setSaving(true);
                                        const { deleteMyAccount } = await import('@/lib/actions/invitation');
                                        const idToken = await user.getIdToken();
                                        const result = await deleteMyAccount(idToken);
                                        if (result.success) {
                                            alert('退会手続きが完了しました。ご利用ありがとうございました。');
                                            // Force sign out from client side
                                            const { getAuth, signOut } = await import('firebase/auth');
                                            await signOut(getAuth());
                                            window.location.href = '/';
                                        } else {
                                            alert('エラーが発生しました: ' + result.error);
                                            setSaving(false);
                                        }
                                    } catch (e: any) {
                                        alert('エラー: ' + e.message);
                                        setSaving(false);
                                    }
                                }
                            }}
                            className="w-full sm:w-auto self-start px-6 py-3 border-2 border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95"
                        >
                            アカウントを削除（退会）する
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-6">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 text-white px-12 py-4 rounded-full font-bold hover:bg-blue-700 transition shadow-xl shadow-blue-100 disabled:opacity-50"
                    >
                        {saving ? '保存中...' : '設定を保存する'}
                    </button>
                    {message && <span className="font-bold text-gray-700 animate-fade-in">{message}</span>}
                </div>
            </form>
        </div>
    );
}
