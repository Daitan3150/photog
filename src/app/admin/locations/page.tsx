'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/admin/AuthProvider';
import { getLocations, saveLocation, updateLocation, deleteLocation } from '@/lib/actions/locations';
import { getZipAddressAction } from '@/lib/actions/studios';
import { Location, LocationFormData } from '@/types/location';
import { Plus, Edit2, Trash2, X, MapPin, Search } from 'lucide-react';
import LeafletMap from '@/components/common/LeafletMap';

export default function LocationsPage() {
    const { user } = useAuth();
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [formData, setFormData] = useState<LocationFormData & { coordsInput?: string }>({
        name: '',
        type: 'outdoor',
        note: '',
        address: '',
        addressZip: '',
        addressPref: '',
        addressCity: '',
        url: '',
        latitude: null,
        longitude: null,
        coordsInput: '',
    });

    const LOCATION_TYPE_LABELS = {
        outdoor: '屋外',
        indoor: '室内',
        other: 'その他',
    } as const;

    const sortLocationsByType = (items: Location[]) => {
        const order: Location['type'][] = ['outdoor', 'indoor', 'other'];
        return [...items].sort((a, b) => {
            const typeOrder = order.indexOf(a.type) - order.indexOf(b.type);
            if (typeOrder !== 0) return typeOrder;
            return a.name.localeCompare(b.name, 'ja', { sensitivity: 'base' });
        });
    };
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | Location['type']>('all');
    const [isLookingUpZip, setIsLookingUpZip] = useState(false);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const result = await getLocations();
            setLocations(sortLocationsByType(result));
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
                url: location.url || '',
                latitude: location.latitude ?? null,
                longitude: location.longitude ?? null,
                coordsInput: (location.latitude != null && location.longitude != null) ? `${location.latitude}, ${location.longitude}` : '',
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
                url: '',
                latitude: null,
                longitude: null,
                coordsInput: '',
            });
        }
        setError('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingLocation(null);
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
            const data = await getZipAddressAction(zip) as any;

            if (data && data.results && data.results.length > 0) {
                const result = data.results[0];
                const pref = result.address1 || '';
                const city = (result.address2 || '') + (result.address3 || '');
                setFormData(prev => ({
                    ...prev,
                    addressPref: pref,
                    addressCity: city,
                }));
                // 住所取得後に座標も自動検索
                handleCoordinateSearch(`${pref} ${city}`);
            } else {
                setError('該当する住所が見つかりませんでした。');
            }
        } catch (err) {
            setError('住所の検索中にエラーが発生しました。');
        } finally {
            setIsLookingUpZip(false);
        }
    };

    // 住所からGPS座標を検索
    const handleCoordinateSearch = async (forcedQuery?: string) => {
        const query = forcedQuery || [formData.addressPref, formData.addressCity, formData.address].filter(Boolean).join(' ');
        if (!query) {
            setError('住所情報を入力してから検索してください。');
            return;
        }

        setIsLookingUpZip(true);
        setError('');
        try {
            const { searchCoordinatesAction } = await import('@/lib/actions/photos');
            let results = await searchCoordinatesAction(query);

            // Fallback: 詳細住所で見つからない場合、都道府県+市区町村で再検索
            if ((!results || results.length === 0) && !forcedQuery && formData.address) {
                const secondaryQuery = [formData.addressPref, formData.addressCity].filter(Boolean).join(' ');
                results = await searchCoordinatesAction(secondaryQuery);
            }

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

    // GPS座標入力のパース（半角/全角コンマ、スペース対応）
    const handleCoordsInputChange = (val: string) => {
        const parts = val.split(/[,，\s/]+/).map(p => p.trim()).filter(Boolean);
        let lat = formData.latitude;
        let lng = formData.longitude;

        if (parts.length >= 2) {
            const parseCoord = (s: string, negChars: string[]) => {
                const match = s.match(/[-]?\d+(\.\d+)?/);
                if (!match) return NaN;
                let num = parseFloat(match[0]);
                if (negChars.some(c => s.includes(c))) num = -Math.abs(num);
                return num;
            };

            const parsedLat = parseCoord(parts[0], ['南', 'S', 's']);
            const parsedLng = parseCoord(parts[1], ['西', 'W', 'w']);

            if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
                lat = parsedLat;
                lng = parsedLng;
            }
        }

        setFormData(prev => ({
            ...prev,
            coordsInput: val,
            latitude: lat,
            longitude: lng
        }));
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

            // coordsInput ヘルパーを除外して保存
            const { coordsInput, ...dataToSave } = formData;

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

    const filteredLocations = sortLocationsByType(locations.filter(loc => {
        const q = searchQuery.toLowerCase();
        const matchesQuery = (
            loc.name.toLowerCase().includes(q) ||
            loc.type.toLowerCase().includes(q) ||
            (loc.address || '').toLowerCase().includes(q) ||
            (loc.note || '').toLowerCase().includes(q)
        );
        const matchesType = activeTypeFilter === 'all' || loc.type === activeTypeFilter;
        return matchesQuery && matchesType;
    }));

    const groupedLocations = (activeTypeFilter === 'all'
        ? (['outdoor', 'indoor', 'other'] as Location['type'][]).map(type => ({
            type,
            items: filteredLocations.filter(location => location.type === type),
        })).filter(group => group.items.length > 0)
        : [{ type: activeTypeFilter, items: filteredLocations }]
    );

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

            <div className="relative mb-4">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="名前、住所、タイプで検索..."
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all text-sm"
                />
            </div>

            <div className="mb-6">
                <div className="flex flex-wrap gap-2 p-2 rounded-2xl border border-sky-100 bg-sky-50/70 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setActiveTypeFilter('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTypeFilter === 'all' ? 'bg-sky-600 text-white shadow-sm' : 'bg-white text-sky-700 border border-sky-100 hover:bg-sky-100'}`}
                    >
                        すべて
                    </button>
                    {(['outdoor', 'indoor', 'other'] as const).map(type => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setActiveTypeFilter(type)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTypeFilter === type ? 'bg-sky-600 text-white shadow-sm' : 'bg-white text-sky-700 border border-sky-100 hover:bg-sky-100'}`}
                        >
                            {LOCATION_TYPE_LABELS[type]}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-sky-600 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredLocations.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <MapPin className="mx-auto text-sky-300 mb-4" size={48} />
                            <p className="text-gray-500">該当するロケーションがありません。</p>
                        </div>
                    ) : (
                        groupedLocations.map(group => (
                            <section key={group.type} className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-bold text-gray-700">{LOCATION_TYPE_LABELS[group.type]}</h2>
                                    <span className="text-xs text-gray-400">({group.items.length})</span>
                                </div>
                                <div className="space-y-3">
                                    {group.items.map(location => (
                                        <div key={location.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 p-5 bg-white rounded-3xl border border-gray-200 shadow-sm">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold uppercase tracking-widest">{LOCATION_TYPE_LABELS[location.type]}</span>
                                                    {location.address && <span className="text-[10px] text-gray-400">{location.address}</span>}
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900">{location.name}</h3>
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
                                    ))}
                                </div>
                            </section>
                        ))
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                        <header className="px-8 py-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingLocation ? 'ロケーション情報の編集' : '新規ロケーションの登録'}
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            {error && (
                                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold border border-rose-100">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* 左カラム */}
                                <div className="space-y-6">
                                    {/* ロケーション名 */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">
                                            ロケーション名 (必須)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                            placeholder="例: 代々木公園"
                                            required
                                        />
                                    </div>

                                    {/* タイプ */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">
                                            タイプ
                                        </label>
                                        <select
                                            value={formData.type}
                                            onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as 'outdoor' | 'indoor' | 'other' }))}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                        >
                                            <option value="outdoor">屋外</option>
                                            <option value="indoor">室内</option>
                                            <option value="other">その他</option>
                                        </select>
                                    </div>

                                    {/* 住所一括入力 (Smart Parse) */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-sky-500 ml-1 flex items-center gap-2">
                                            <Search size={12} />
                                            住所一括入力 (Smart Parse)
                                        </label>
                                        <textarea
                                            value={formData.address || ''}
                                            onChange={(e) => {
                                                const input = e.target.value;
                                                const zipMatch = input.match(/(?:〒?\s?)(\d{3}-\d{4}|\d{7})/);
                                                const zip = zipMatch ? (zipMatch[1].includes('-') ? zipMatch[1] : `${zipMatch[1].slice(0, 3)}-${zipMatch[1].slice(3)}`) : '';

                                                const prefMatch = input.match(/(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/);
                                                const pref = prefMatch ? prefMatch[1] : '';

                                                let addr = input;
                                                if (zipMatch) addr = addr.replace(zipMatch[0], '');
                                                if (prefMatch) addr = addr.replace(prefMatch[0], '');
                                                addr = addr.replace(/^[\s　,]+|[\s　,]+$/g, '');

                                                setFormData(prev => ({
                                                    ...prev,
                                                    address: input,
                                                    addressZip: zip || prev.addressZip,
                                                    addressPref: pref || prev.addressPref,
                                                    addressCity: addr || prev.addressCity,
                                                }));
                                            }}
                                            className="w-full px-5 py-3.5 bg-sky-50/30 border border-sky-100 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all text-xs h-24 resize-none"
                                            placeholder="例: 〒 123-4567 東京都墨田区立川4-11-20"
                                        />
                                        <p className="text-[9px] text-amber-600 font-medium ml-1">※ 住所を貼り付けると自動抽出されます</p>
                                    </div>

                                    {/* 郵便番号 */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">
                                            郵便番号
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.addressZip || ''}
                                            onChange={e => setFormData(prev => ({ ...prev, addressZip: e.target.value }))}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                            placeholder="123-4567"
                                            maxLength={8}
                                        />
                                    </div>

                                    {/* 都道府県 & 市区町村 */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">
                                                都道府県
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.addressPref || ''}
                                                onChange={e => setFormData(prev => ({ ...prev, addressPref: e.target.value }))}
                                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                                placeholder="東京都"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">
                                                市区町村・番地
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.addressCity || ''}
                                                onChange={e => setFormData(prev => ({ ...prev, addressCity: e.target.value }))}
                                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                                placeholder="墨田区立川..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 右カラム */}
                                <div className="space-y-6">
                                    {/* WEBサイトURL */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">
                                            WEBサイトなどのURL (任意)
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.url || ''}
                                            onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                            placeholder="https://example.com"
                                        />
                                    </div>

                                    {/* GPS座標 */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">
                                                GPS座標 (緯度, 経度)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => handleCoordinateSearch()}
                                                className="text-[9px] text-sky-600 font-bold hover:underline"
                                            >
                                                住所から取得
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.coordsInput}
                                            onChange={(e) => handleCoordsInputChange(e.target.value)}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all text-sm font-medium"
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

                                    {/* メモ */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">
                                            メモ (任意)
                                        </label>
                                        <textarea
                                            value={formData.note || ''}
                                            onChange={e => setFormData(prev => ({ ...prev, note: e.target.value }))}
                                            rows={3}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all text-sm font-medium resize-none"
                                            placeholder="例: 公園中央広場、イベント開催時に使用"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                {editingLocation && (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(editingLocation)}
                                        className="flex-[1] flex items-center justify-center gap-2 py-4 rounded-2xl text-red-500 font-bold border-2 border-red-50 hover:bg-red-50 transition-all active:scale-95 text-xs"
                                    >
                                        <Trash2 size={16} />
                                        ロケーションを削除
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-[2] bg-sky-600 text-white py-4 rounded-2xl hover:bg-sky-700 transition-all font-bold shadow-xl shadow-sky-100 active:scale-95 disabled:opacity-50 h-14"
                                >
                                    {isSaving ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                                    ) : (
                                        editingLocation ? '変更を保存する' : 'ロケーションを追加'
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
