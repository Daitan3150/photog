'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/admin/AuthProvider';
import { getLocations, saveLocation, updateLocation, deleteLocation } from '@/lib/actions/locations';
import { Location, LocationFormData } from '@/types/location';
import { Plus, Edit2, Trash2, X, MapPin, Search } from 'lucide-react';

export default function LocationsPage() {
    const { user } = useAuth();
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [formData, setFormData] = useState<LocationFormData>({
        name: '',
        type: 'outdoor',
        note: '',
        address: '',
        addressZip: '',
        addressPref: '',
        addressCity: '',
        latitude: null,
        longitude: null
    });
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const result = await getLocations();
            setLocations(result);
        } catch (err) {
            console.error('Failed to fetch locations:', err);
        }
        setLoading(false);
    };

    const openModal = (location: Location | null = null) => {
        if (location) {
            setEditingLocation(location);
            setFormData({
                name: location.name,
                type: location.type,
                note: location.note || '',
                address: location.address || '',
                addressZip: location.addressZip || '',
                addressPref: location.addressPref || '',
                addressCity: location.addressCity || '',
                latitude: location.latitude ?? null,
                longitude: location.longitude ?? null,
            });
        } else {
            setEditingLocation(null);
            setFormData({
                name: '',
                type: 'outdoor',
                note: '',
                address: '',
                addressZip: '',
                addressPref: '',
                addressCity: '',
                latitude: null,
                longitude: null,
            });
        }
        setError('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingLocation(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            setError('ロケーション名は必須です。');
            return;
        }
        setIsSaving(true);
        setError('');
        try {
            const token = await user?.getIdToken();
            if (!token) throw new Error('Authentication required');

            const dataToSave = {
                name: formData.name,
                type: formData.type,
                note: formData.note || '',
                address: formData.address || '',
                addressZip: formData.addressZip || '',
                addressPref: formData.addressPref || '',
                addressCity: formData.addressCity || '',
                latitude: formData.latitude ?? null,
                longitude: formData.longitude ?? null,
            };

            const result = editingLocation ? await updateLocation(editingLocation.id as string, dataToSave, token) : await saveLocation(dataToSave, token);
            if (result.success) {
                await fetchLocations();
                closeModal();
            } else {
                setError(result.error || '保存中にエラーが発生しました。');
            }
        } catch (err: any) {
            setError(err.message || 'エラーが発生しました。');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (location: Location) => {
        if (!confirm(`「${location.name}」を削除しますか？`)) return;
        try {
            const token = await user?.getIdToken();
            if (!token) throw new Error('Authentication required');
            const result = await deleteLocation(location.id as string, token);
            if (result.success) {
                await fetchLocations();
            } else {
                alert(result.error || '削除中にエラーが発生しました。');
            }
        } catch (err) {
            alert('削除中にエラーが発生しました。');
        }
    };

    const filteredLocations = locations.filter(loc => {
        const q = searchQuery.toLowerCase();
        return (
            loc.name.toLowerCase().includes(q) ||
            loc.type.toLowerCase().includes(q) ||
            (loc.address || '').toLowerCase().includes(q) ||
            (loc.note || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="max-w-6xl mx-auto py-10 px-4 md:px-8">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">ロケーション管理</h1>
                    <p className="text-sm text-gray-500 mt-1">屋外・その他の撮影場所を登録し、アップロード時に選択できるようにします。</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-sky-600 text-white px-5 py-2.5 rounded-xl hover:bg-sky-700 transition-all font-bold shadow-lg shadow-sky-100 active:scale-95"
                >
                    <Plus size={20} />
                    新しいロケーションを追加
                </button>
            </header>

            <div className="relative mb-6">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="名前、住所、タイプで検索..."
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all text-sm"
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-sky-600 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredLocations.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <MapPin className="mx-auto text-sky-300 mb-4" size={48} />
                            <p className="text-gray-500">該当するロケーションがありません。</p>
                        </div>
                    ) : (
                        filteredLocations.map(location => (
                            <div key={location.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 p-5 bg-white rounded-3xl border border-gray-200 shadow-sm">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold uppercase tracking-widest">{location.type === 'outdoor' ? '屋外' : 'その他'}</span>
                                        {location.address && <span className="text-[10px] text-gray-400">{location.address}</span>}
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900">{location.name}</h2>
                                    {location.note && <p className="text-sm text-gray-500 mt-1">{location.note}</p>}
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                                        {location.addressPref && <span>{location.addressPref}</span>}
                                        {location.addressCity && <span>{location.addressCity}</span>}
                                        {location.addressZip && <span>{location.addressZip}</span>}
                                        {location.latitude !== undefined && location.latitude !== null && location.longitude !== undefined && location.longitude !== null && (
                                            <span>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-start md:justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openModal(location)}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-sky-200 text-sky-700 hover:bg-sky-50 transition-all"
                                    >
                                        <Edit2 size={16} /> 編集
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(location)}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-rose-200 text-rose-700 hover:bg-rose-50 transition-all"
                                    >
                                        <Trash2 size={16} /> 削除
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{editingLocation ? 'ロケーションを編集' : '新しいロケーションを追加'}</h2>
                                <p className="text-sm text-gray-500">屋外・その他の撮影地を事前登録してください。</p>
                            </div>
                            <button onClick={closeModal} className="p-2 text-gray-500 hover:text-gray-900 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">ロケーション名</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full p-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-sky-500"
                                        placeholder="代々木公園"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">タイプ</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as 'outdoor' | 'other' }))}
                                        className="w-full p-3 rounded-2xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-sky-500"
                                    >
                                        <option value="outdoor">屋外</option>
                                        <option value="other">その他</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input
                                    type="text"
                                    value={formData.addressZip}
                                    onChange={e => setFormData(prev => ({ ...prev, addressZip: e.target.value }))}
                                    placeholder="郵便番号"
                                    className="w-full p-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-sky-500"
                                />
                                <input
                                    type="text"
                                    value={formData.addressPref}
                                    onChange={e => setFormData(prev => ({ ...prev, addressPref: e.target.value }))}
                                    placeholder="都道府県"
                                    className="w-full p-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-sky-500"
                                />
                                <input
                                    type="text"
                                    value={formData.addressCity}
                                    onChange={e => setFormData(prev => ({ ...prev, addressCity: e.target.value }))}
                                    placeholder="市区町村・番地"
                                    className="w-full p-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-sky-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">住所 (任意)</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="東京都渋谷区代々木"
                                    className="w-full p-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-sky-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    value={formData.latitude ?? ''}
                                    onChange={e => setFormData(prev => ({ ...prev, latitude: e.target.value ? parseFloat(e.target.value) : null }))}
                                    placeholder="緯度"
                                    className="w-full p-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-sky-500"
                                />
                                <input
                                    type="text"
                                    value={formData.longitude ?? ''}
                                    onChange={e => setFormData(prev => ({ ...prev, longitude: e.target.value ? parseFloat(e.target.value) : null }))}
                                    placeholder="経度"
                                    className="w-full p-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-sky-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">メモ</label>
                                <textarea
                                    value={formData.note || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, note: e.target.value }))}
                                    rows={3}
                                    className="w-full p-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-sky-500"
                                    placeholder="例: 公園中央広場、イベント開催時に使用"
                                />
                            </div>

                            {error && <p className="text-sm text-rose-600">{error}</p>}

                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 py-3 rounded-2xl bg-sky-600 text-white text-sm font-bold hover:bg-sky-700 disabled:opacity-50"
                                >
                                    {editingLocation ? '更新する' : '保存する'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
