'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/admin/AuthProvider';
import { getStudios, saveStudio, updateStudio, deleteStudio } from '@/lib/actions/studios';
import { Studio, StudioFormData } from '@/types/studio';
import { Plus, Edit2, Trash2, X, ExternalLink, Home, MapPin, Search } from 'lucide-react';
import LeafletMap from '@/components/common/LeafletMap';

export default function StudiosPage() {
    const { user } = useAuth();
    const [studios, setStudios] = useState<Studio[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudio, setEditingStudio] = useState<Studio | null>(null);
    const [formData, setFormData] = useState<StudioFormData & { coordsInput?: string }>({
        name: '',
        addressZip: '',
        addressPref: '',
        addressCity: '',
        address: '',
        url: '',
        latitude: null,
        longitude: null,
        coordsInput: '',
    });
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLookingUpZip, setIsLookingUpZip] = useState(false);

    useEffect(() => {
        fetchStudios();
    }, []);

    const fetchStudios = async () => {
        setLoading(true);
        try {
            const result = await getStudios();
            setStudios(result);
        } catch (err) {
            console.error('Failed to fetch studios:', err);
        }
        setLoading(false);
    };

    const handleOpenModal = (studio: Studio | null = null) => {
        if (studio) {
            setEditingStudio(studio);
            setFormData({
                name: studio.name,
                addressZip: studio.addressZip || '',
                addressPref: studio.addressPref || '',
                addressCity: studio.addressCity || '',
                address: studio.address || '',
                url: studio.url || '',
                latitude: studio.latitude || null,
                longitude: studio.longitude || null,
                coordsInput: (studio.latitude && studio.longitude) ? `${studio.latitude}, ${studio.longitude}` : '',
            });
        } else {
            setEditingStudio(null);
            setFormData({
                name: '',
                addressZip: '',
                addressPref: '',
                addressCity: '',
                address: '',
                url: '',
                latitude: null,
                longitude: null,
                coordsInput: '',
            });
        }
        setError('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingStudio(null);
    };

    // 郵便番号から住所を自動取得
    const handleZipLookup = async () => {
        const zip = formData.addressZip?.replace(/[^0-9]/g, '');
        if (!zip || zip.length !== 7) {
            setError('郵便番号は7桁で入力してください。');
            return;
        }

        setIsLookingUpZip(true);
        setError('');
        try {
            const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`);
            const data = await res.json() as { results: { address1: string; address2: string; address3: string }[] | null };

            if (data.results && data.results.length > 0) {
                const result = data.results[0];
                setFormData(prev => ({
                    ...prev,
                    addressPref: result.address1 || '',
                    addressCity: (result.address2 || '') + (result.address3 || ''),
                }));
            } else {
                setError('該当する住所が見つかりませんでした。');
            }
        } catch (err) {
            setError('住所の検索中にエラーが発生しました。');
        } finally {
            setIsLookingUpZip(false);
        }
    };

    const handleCoordinateSearch = async () => {
        const query = [formData.addressPref, formData.addressCity, formData.address].filter(Boolean).join(' ');
        if (!query) {
            setError('住所情報を入力してから検索してください。');
            return;
        }

        setIsLookingUpZip(true);
        setError('');
        try {
            const { searchCoordinatesAction } = await import('@/lib/actions/photos');
            const results = await searchCoordinatesAction(query);
            if (results && results.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    latitude: results[0].lat,
                    longitude: results[0].lng,
                    coordsInput: `${results[0].lat}, ${results[0].lng}`
                }));
            } else {
                setError('座標が見つかりませんでした。住所を詳しく入力してください。');
            }
        } catch (err) {
            setError('座標の検索中にエラーが発生しました。');
        } finally {
            setIsLookingUpZip(false);
        }
    };

    const handleCoordsInputChange = (val: string) => {
        setFormData(prev => ({ ...prev, coordsInput: val }));
        // Parse "lat, lng"
        const parts = val.split(',').map(p => p.trim());
        if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
                setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            setError('スタジオ名は必須です。');
            return;
        }

        setIsSaving(true);
        setError('');

        try {
            const idToken = await user?.getIdToken();
            if (!idToken) {
                setError('認証エラー: 再ログインしてください。');
                setIsSaving(false);
                return;
            }

            // Remove coordsInput helper from data to save
            const { coordsInput, ...dataToSave } = formData;

            let result;
            if (editingStudio?.id) {
                result = await updateStudio(editingStudio.id, dataToSave, idToken);
            } else {
                result = await saveStudio(dataToSave, idToken);
            }

            if (result.success) {
                await fetchStudios();
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
        if (!confirm(`「${name}」を削除してもよろしいですか？\nこの操作は取り消せません。`)) return;

        try {
            const idToken = await user?.getIdToken();
            if (!idToken) {
                alert('認証エラー: 再ログインしてください。');
                return;
            }

            const result = await deleteStudio(id, idToken);
            if (result.success) {
                fetchStudios();
            } else {
                alert(result.error || '削除中にエラーが発生しました。');
            }
        } catch (err) {
            alert('削除中にエラーが発生しました。');
        }
    };

    // フィルタリングされたスタジオ一覧
    const filteredStudios = studios.filter(studio => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            studio.name.toLowerCase().includes(q) ||
            (studio.addressPref || '').toLowerCase().includes(q) ||
            (studio.addressCity || '').toLowerCase().includes(q) ||
            (studio.address || '').toLowerCase().includes(q)
        );
    });

    if (!user) return null;

    return (
        <div className="max-w-6xl mx-auto py-10 px-4 md:px-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">スタジオ管理</h1>
                    <p className="text-sm text-gray-500 mt-1">撮影スタジオの登録と住所情報を管理します。</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 active:scale-95"
                >
                    <Plus size={20} />
                    新規スタジオ登録
                </button>
            </header>

            {/* Search */}
            {studios.length > 0 && (
                <div className="relative mb-6">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="スタジオ名や住所で検索..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium"
                    />
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
            ) : studios.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Home className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-500 font-medium">登録されているスタジオはありません。</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="mt-4 text-blue-600 font-bold hover:underline"
                    >
                        最初のスタジオを登録する
                    </button>
                </div>
            ) : filteredStudios.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Search className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-500 font-medium">「{searchQuery}」に一致するスタジオはありません。</p>
                </div>
            ) : (
                <>
                    {/* Stats */}
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {filteredStudios.length} 件のスタジオ
                        </span>
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredStudios.map((studio) => (
                            <div
                                key={studio.id}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 overflow-hidden group"
                            >
                                {/* Card Header */}
                                <div className="px-6 pt-6 pb-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                                                <Home size={18} />
                                            </div>
                                            <h3 className="text-sm font-bold text-gray-900 truncate">{studio.name}</h3>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                            <button
                                                onClick={() => handleOpenModal(studio)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="編集"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => studio.id && handleDelete(studio.id, studio.name)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="削除"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="px-6 pb-5 space-y-3">
                                    {/* Address */}
                                    {(studio.addressZip || studio.addressPref || studio.addressCity) && (
                                        <div className="flex items-start gap-2 text-xs text-gray-500">
                                            <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                            <div>
                                                {studio.addressZip && (
                                                    <span className="text-gray-400">〒{studio.addressZip} </span>
                                                )}
                                                <span>
                                                    {studio.addressPref}{studio.addressCity}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* URL */}
                                    {studio.url && (
                                        <a
                                            href={studio.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium truncate max-w-full transition-colors"
                                        >
                                            <ExternalLink size={12} className="flex-shrink-0" />
                                            <span className="truncate">{studio.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                                        </a>
                                    )}
                                </div>

                                {/* Card Footer */}
                                <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-50">
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        {studio.createdAt
                                            ? `登録: ${new Date(studio.createdAt).toLocaleDateString('ja-JP')}`
                                            : ''}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                        <header className="px-8 py-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingStudio ? 'スタジオ情報の編集' : '新規スタジオの登録'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* 左カラム */}
                                <div className="space-y-6">
                                    {/* スタジオ名 */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">
                                            スタジオ名 (必須)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                            placeholder="例: スタジオ シェア"
                                            required
                                        />
                                    </div>

                                    {/* 郵便番号 + 自動入力 */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">
                                            郵便番号
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={formData.addressZip || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9-]/g, '');
                                                    setFormData({ ...formData, addressZip: val });
                                                }}
                                                className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                                placeholder="123-4567"
                                                maxLength={8}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleZipLookup}
                                                disabled={isLookingUpZip}
                                                className="px-4 py-3.5 bg-gray-800 text-white rounded-2xl hover:bg-gray-900 transition-all text-xs font-bold whitespace-nowrap active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {isLookingUpZip ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <MapPin size={14} />
                                                )}
                                                検索
                                            </button>
                                        </div>
                                    </div>

                                    {/* 都道府県 */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">
                                            都道府県
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.addressPref || ''}
                                            onChange={(e) => setFormData({ ...formData, addressPref: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                            placeholder="東京都"
                                        />
                                    </div>

                                    {/* 市区町村・番地 */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">
                                            市区町村・番地・建物名
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.addressCity || ''}
                                            onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                            placeholder="墨田区立川4-11-20 プロスパリティ1 101"
                                        />
                                    </div>
                                </div>

                                {/* 右カラム */}
                                <div className="space-y-6">
                                    {/* URL */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">
                                            WEBサイト URL (任意)
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.url || ''}
                                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                            placeholder="https://www.studio-example.com/"
                                        />
                                    </div>

                                    {/* 座標設定 */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">
                                                GPS座標 (緯度, 経度)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleCoordinateSearch}
                                                className="text-[9px] text-blue-600 font-bold hover:underline"
                                            >
                                                住所から取得
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.coordsInput}
                                            onChange={(e) => handleCoordsInputChange(e.target.value)}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                            placeholder="35.6895, 139.6917"
                                        />
                                    </div>

                                    {/* 地図プレビュー */}
                                    <div className="w-full aspect-video rounded-2xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50 relative">
                                        <LeafletMap
                                            lat={formData.latitude || 35.6895}
                                            lng={formData.longitude || 139.6917}
                                            height="100%"
                                        />
                                        {!formData.latitude && (
                                            <div className="absolute inset-0 bg-black/5 flex items-center justify-center p-4 text-center">
                                                <p className="text-[10px] text-gray-400 font-bold">有効な座標が入力されると<br />ここに地図が表示されます</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                {editingStudio && (
                                    <button
                                        type="button"
                                        onClick={() => editingStudio.id && handleDelete(editingStudio.id, editingStudio.name)}
                                        className="flex-[1] flex items-center justify-center gap-2 py-4 rounded-2xl text-red-500 font-bold border-2 border-red-50 hover:bg-red-50 transition-all active:scale-95 text-xs"
                                    >
                                        <Trash2 size={16} />
                                        スタジオを削除
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50 h-14"
                                >
                                    {isSaving ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                                    ) : (
                                        editingStudio ? '変更を保存する' : '新しく登録する'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
