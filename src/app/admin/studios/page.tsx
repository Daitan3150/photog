'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/admin/AuthProvider';
import { getStudios, saveStudio, updateStudio, deleteStudio, getZipAddressAction } from '@/lib/actions/studios';
import { getLocations, saveLocation, updateLocation, deleteLocation } from '@/lib/actions/locations';
import { Studio, StudioFormData } from '@/types/studio';
import { Location, LocationFormData } from '@/types/location';
import { Plus, Edit2, Trash2, X, ExternalLink, Home, MapPin, Search } from 'lucide-react';
import LeafletMap from '@/components/common/LeafletMap';

export default function StudiosPage() {
    const { user } = useAuth();
    const [studios, setStudios] = useState<Studio[]>([]);
    const [loading, setLoading] = useState(true);
    const [locationLoading, setLocationLoading] = useState(true);
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

    const [activeTab, setActiveTab] = useState<'studios' | 'locations'>('studios');
    const [locations, setLocations] = useState<Location[]>([]);
    const [locationSearchQuery, setLocationSearchQuery] = useState('');
    const [activeLocationTypeFilter, setActiveLocationTypeFilter] = useState<'all' | Location['type']>('all');
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [locationFormData, setLocationFormData] = useState<LocationFormData & { coordsInput?: string }>({
        name: '',
        type: 'outdoor',
        note: '',
        address: '',
        addressZip: '',
        addressPref: '',
        addressCity: '',
        latitude: null,
        longitude: null,
        coordsInput: '',
    });
    const [locationError, setLocationError] = useState('');
    const [locationSaving, setLocationSaving] = useState(false);
    const [isLocationLookingUpZip, setIsLocationLookingUpZip] = useState(false);

    const LOCATION_TYPE_LABELS = {
        outdoor: '屋外',
        indoor: '室内',
        other: 'その他',
    } as const;

    const LOCATION_TYPE_CLASSES = {
        outdoor: 'bg-emerald-50 text-emerald-700',
        indoor: 'bg-purple-50 text-purple-700',
        other: 'bg-yellow-50 text-yellow-700',
    } as const;

    const sortLocationsByType = (items: Location[]) => {
        const order: Location['type'][] = ['outdoor', 'indoor', 'other'];
        return [...items].sort((a, b) => {
            const typeOrder = order.indexOf(a.type) - order.indexOf(b.type);
            if (typeOrder !== 0) return typeOrder;
            return a.name.localeCompare(b.name, 'ja', { sensitivity: 'base' });
        });
    };

    useEffect(() => {
        fetchStudios();
        fetchLocations();
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

    const fetchLocations = async () => {
        setLocationLoading(true);
        try {
            const result = await getLocations();
            setLocations(sortLocationsByType(result));
        } catch (err) {
            console.error('Failed to fetch locations:', err);
        }
        setLocationLoading(false);
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

    const handleOpenLocationModal = (location: Location | null = null) => {
        if (location) {
            setEditingLocation(location);
            setLocationFormData({
                name: location.name,
                type: location.type,
                note: location.note || '',
                address: location.address || '',
                addressZip: location.addressZip || '',
                addressPref: location.addressPref || '',
                addressCity: location.addressCity || '',
                latitude: location.latitude ?? null,
                longitude: location.longitude ?? null,
                coordsInput: (location.latitude != null && location.longitude != null) ? `${location.latitude}, ${location.longitude}` : '',
            });
        } else {
            setEditingLocation(null);
            setLocationFormData({
                name: '',
                type: 'outdoor',
                note: '',
                address: '',
                addressZip: '',
                addressPref: '',
                addressCity: '',
                latitude: null,
                longitude: null,
                coordsInput: '',
            });
        }
        setLocationError('');
        setIsLocationModalOpen(true);
    };

    const handleCloseLocationModal = () => {
        setIsLocationModalOpen(false);
        setEditingLocation(null);
    };

    const handleLocationZipLookup = async () => {
        const zip = locationFormData.addressZip?.replace(/[^0-9]/g, '');
        if (!zip || zip.length !== 7) {
            setLocationError('郵便番号は7桁で入力してください。');
            return;
        }

        setIsLocationLookingUpZip(true);
        setLocationError('');
        try {
            const data = await getZipAddressAction(zip) as any;

            if (data && data.results && data.results.length > 0) {
                const result = data.results[0];
                const pref = result.address1 || '';
                const city = (result.address2 || '') + (result.address3 || '');
                setLocationFormData(prev => ({
                    ...prev,
                    addressPref: pref,
                    addressCity: city,
                }));
                // Auto Search Coords with the fresh values
                handleLocationCoordinateSearch(`${pref} ${city}`);
            } else {
                setLocationError('該当する住所が見つかりませんでした。');
            }
        } catch (err) {
            setLocationError('住所の検索中にエラーが発生しました。');
        } finally {
            setIsLocationLookingUpZip(false);
        }
    };

    const handleLocationCoordinateSearch = async (forcedQuery?: string) => {
        const query = forcedQuery || [locationFormData.addressPref, locationFormData.addressCity, locationFormData.address].filter(Boolean).join(' ');
        if (!query) {
            setLocationError('住所情報を入力してから検索してください。');
            return;
        }

        setIsLocationLookingUpZip(true);
        setLocationError('');
        try {
            const { searchCoordinatesAction } = await import('@/lib/actions/photos');
            let results = await searchCoordinatesAction(query);

            // Fallback: If not found, try without the detailed address
            if ((!results || results.length === 0) && !forcedQuery && locationFormData.address) {
                const secondaryQuery = [locationFormData.addressPref, locationFormData.addressCity].filter(Boolean).join(' ');
                results = await searchCoordinatesAction(secondaryQuery);
            }

            if (results && results.length > 0) {
                setLocationFormData(prev => ({
                    ...prev,
                    latitude: results[0].lat,
                    longitude: results[0].lng,
                    coordsInput: `${results[0].lat}, ${results[0].lng}`
                }));
            } else {
                setLocationError('座標が見つかりませんでした。住所を詳しく入力してください。');
            }
        } catch (err) {
            setLocationError('座標の検索中にエラーが発生しました。');
        } finally {
            setIsLocationLookingUpZip(false);
        }
    };

    const handleLocationCoordsInputChange = (val: string) => {
        // Parse "lat, lng" - handle both half-width and full-width commas, and spaces
        const parts = val.split(/[,，\s/]+/).map(p => p.trim()).filter(Boolean);
        let lat = locationFormData.latitude;
        let lng = locationFormData.longitude;

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

        setLocationFormData(prev => ({
            ...prev,
            coordsInput: val,
            latitude: lat,
            longitude: lng
        }));
    };

    const handleLocationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!locationFormData.name) {
            setLocationError('ロケーション名は必須です。');
            return;
        }

        setLocationSaving(true);
        setLocationError('');

        try {
            const token = await user?.getIdToken();
            if (!token) {
                setLocationError('認証エラー: 再ログインしてください。');
                setLocationSaving(false);
                return;
            }

            // Remove coordsInput helper from data to save
            const { coordsInput, ...dataToSave } = locationFormData;

            const result = editingLocation?.id
                ? await updateLocation(editingLocation.id, dataToSave, token)
                : await saveLocation(dataToSave, token);

            if (result.success) {
                await fetchLocations();
                handleCloseLocationModal();
            } else {
                setLocationError(result.error || '保存中にエラーが発生しました。');
            }
        } catch (err: any) {
            setLocationError(err.message || 'エラーが発生しました。');
        } finally {
            setLocationSaving(false);
        }
    };

    const handleDeleteLocation = async (location: Location) => {
        if (!confirm(`「${location.name}」を削除してもよろしいですか？\nこの操作は取り消せません。`)) return;

        try {
            const token = await user?.getIdToken();
            if (!token) {
                alert('認証エラー: 再ログインしてください。');
                return;
            }

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
                // Auto Search Coords with the fresh values
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

            // Fallback: If not found, try without the detailed address
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

    const handleCoordsInputChange = (val: string) => {
        // Parse "lat, lng" - handle both half-width and full-width commas, and spaces
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

    const filteredLocations = sortLocationsByType(locations.filter((location) => {
        const q = locationSearchQuery.toLowerCase();
        const matchesQuery = !locationSearchQuery
            ? true
            : (
                location.name.toLowerCase().includes(q) ||
                location.type.toLowerCase().includes(q) ||
                (location.address || '').toLowerCase().includes(q) ||
                (location.note || '').toLowerCase().includes(q)
            );
        const matchesType = activeLocationTypeFilter === 'all' || location.type === activeLocationTypeFilter;
        return matchesQuery && matchesType;
    }));

    const groupedLocations = (activeLocationTypeFilter === 'all'
        ? (['outdoor', 'indoor', 'other'] as Location['type'][]).map(type => ({
            type,
            items: filteredLocations.filter(location => location.type === type),
        })).filter(group => group.items.length > 0)
        : [{ type: activeLocationTypeFilter, items: filteredLocations }]
    );

    if (!user) return null;

    return (
        <div className="max-w-6xl mx-auto py-10 px-4 md:px-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        {activeTab === 'locations' ? 'ロケーション管理' : 'スタジオ管理'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {activeTab === 'locations'
                            ? '屋外・その他の撮影場所を登録し、アップロード時に選択できるようにします。'
                            : '撮影スタジオの登録と住所情報を管理します。'}
                    </p>
                </div>
                <button
                    onClick={() => activeTab === 'locations' ? handleOpenLocationModal() : handleOpenModal()}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-bold shadow-lg active:scale-95 ${activeTab === 'locations' ? 'bg-sky-600 text-white hover:bg-sky-700 shadow-sky-100' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'}`}
                >
                    <Plus size={20} />
                    {activeTab === 'locations' ? '新しいロケーションを追加' : '新規スタジオ登録'}
                </button>
            </header>

            {/* Tabs */}
            <div className="mb-6">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <button
                        type="button"
                        onClick={() => setActiveTab('studios')}
                        className={`rounded-3xl px-5 py-3 text-sm font-bold transition ${activeTab === 'studios' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                    >
                        スタジオ管理
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('locations')}
                        className={`rounded-3xl px-5 py-3 text-sm font-bold transition ${activeTab === 'locations' ? 'bg-sky-600 text-white shadow-lg shadow-sky-100' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                    >
                        ロケーション管理
                    </button>
                </div>
            </div>

            {activeTab === 'studios' ? (
                <>
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
                                        onClick={() => handleOpenModal(studio)}
                                        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 overflow-hidden group cursor-pointer"
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
                                                <div className="flex gap-1 flex-shrink-0">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleOpenModal(studio); }}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="編集"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); studio.id && handleDelete(studio.id, studio.name); }}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all tracking-tight"
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
                </>
            ) : (
                <>
                    <div className="relative mb-4">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={locationSearchQuery}
                            onChange={(e) => setLocationSearchQuery(e.target.value)}
                            placeholder="名前、住所、タイプで検索..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all text-sm font-medium"
                        />
                    </div>

                    <div className="mb-6">
                        <div className="flex flex-wrap gap-2 p-2 rounded-2xl border border-sky-100 bg-sky-50/70 shadow-sm">
                            <button
                                type="button"
                                onClick={() => setActiveLocationTypeFilter('all')}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeLocationTypeFilter === 'all' ? 'bg-sky-600 text-white shadow-sm' : 'bg-white text-sky-700 border border-sky-100 hover:bg-sky-100'}`}
                            >
                                すべて
                            </button>
                            {(['outdoor', 'indoor', 'other'] as const).map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setActiveLocationTypeFilter(type)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeLocationTypeFilter === type ? 'bg-sky-600 text-white shadow-sm' : 'bg-white text-sky-700 border border-sky-100 hover:bg-sky-100'}`}
                                >
                                    {LOCATION_TYPE_LABELS[type]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {locationLoading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 border-2 border-gray-200 border-t-sky-600 rounded-full animate-spin" />
                        </div>
                    ) : locations.length === 0 ? (
                        <div className="text-center py-20 bg-sky-50 rounded-2xl border-2 border-dashed border-sky-200">
                            <MapPin className="mx-auto text-sky-300 mb-4" size={48} />
                            <p className="text-sky-500 font-medium">登録されているロケーションはありません。</p>
                            <button
                                onClick={() => handleOpenLocationModal()}
                                className="mt-4 text-sky-600 font-bold hover:underline"
                            >
                                最初のロケーションを追加する
                            </button>
                        </div>
                    ) : filteredLocations.length === 0 ? (
                        <div className="text-center py-20 bg-sky-50 rounded-2xl border-2 border-dashed border-sky-200">
                            <Search className="mx-auto text-sky-300 mb-4" size={48} />
                            <p className="text-sky-500 font-medium">「{locationSearchQuery}」に一致するロケーションはありません。</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {groupedLocations.map((group) => (
                                <section key={group.type} className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-bold text-gray-700">{LOCATION_TYPE_LABELS[group.type]}</h2>
                                        <span className="text-xs text-gray-400">({group.items.length})</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        {group.items.map((location) => (
                                            <div key={location.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 p-5 bg-white rounded-3xl border border-gray-200 shadow-sm">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${LOCATION_TYPE_CLASSES[location.type]}`}>{LOCATION_TYPE_LABELS[location.type]}</span>
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
                                                        onClick={() => handleOpenLocationModal(location)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-sky-200 text-sky-700 hover:bg-sky-50 transition-all"
                                                    >
                                                        <Edit2 size={16} /> 編集
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteLocation(location)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-rose-200 text-rose-700 hover:bg-rose-50 transition-all"
                                                    >
                                                        <Trash2 size={16} /> 削除
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
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

                                    {/* 住所スマートパース (貼り付け用) */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-blue-500 ml-1 flex items-center gap-2">
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
                                                    addressCity: addr || prev.addressCity
                                                }));
                                            }}
                                            className="w-full px-5 py-3.5 bg-blue-50/30 border border-blue-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-xs h-24 resize-none"
                                            placeholder="例: 〒 123-4567 東京都墨田区立川4-11-20"
                                        />
                                        <p className="text-[9px] text-amber-600 font-medium ml-1">※ 住所を貼り付けると自動抽出されます</p>
                                    </div>

                                    {/* 郵便番号 */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">
                                            郵便番号
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={formData.addressZip || ''}
                                                onChange={(e) => setFormData({ ...formData, addressZip: e.target.value })}
                                                className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                                placeholder="123-4567"
                                                maxLength={8}
                                            />
                                        </div>
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
                                                onChange={(e) => setFormData({ ...formData, addressPref: e.target.value })}
                                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
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
                                                onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })}
                                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                                placeholder="墨田区立川..."
                                            />
                                        </div>
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
                                                onClick={() => handleCoordinateSearch()}
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

            {isLocationModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                        <header className="px-8 py-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {editingLocation ? 'ロケーション情報の編集' : '新しいロケーションを追加'}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">屋外・室内・その他の撮影場所を事前登録し、アップロード時に選択できます。</p>
                            </div>
                            <button onClick={handleCloseLocationModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </header>

                        <form onSubmit={handleLocationSubmit} className="px-8 py-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            {locationError && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">
                                    {locationError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* 左カラム */}
                                <div className="space-y-6">
                                    {/* ロケーション名 */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">ロケーション名 (必須)</label>
                                        <input
                                            type="text"
                                            value={locationFormData.name}
                                            onChange={(e) => setLocationFormData(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                            placeholder="例: 代々木公園"
                                            required
                                        />
                                    </div>

                                    {/* タイプ */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">タイプ</label>
                                        <select
                                            value={locationFormData.type}
                                            onChange={(e) => setLocationFormData(prev => ({ ...prev, type: e.target.value as 'outdoor' | 'indoor' | 'other' }))}
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
                                            value={locationFormData.address || ''}
                                            onChange={(e) => {
                                                const input = e.target.value;
                                                const zipMatch = input.match(/(?:〒?\s?)(\d{3}-\d{4}|\d{7})/);
                                                const zip = zipMatch ? (zipMatch[1].includes('-') ? zipMatch[1] : `${zipMatch[1].slice(0, 3)}-${zipMatch[1].slice(3)}`) : '';

                                                const prefMatch = input.match(/(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和求山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/);
                                                const pref = prefMatch ? prefMatch[1] : '';

                                                let addr = input;
                                                if (zipMatch) addr = addr.replace(zipMatch[0], '');
                                                if (prefMatch) addr = addr.replace(prefMatch[0], '');
                                                addr = addr.replace(/^[\s　,]+|[\s　,]+$/g, '');

                                                setLocationFormData(prev => ({
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
                                            value={locationFormData.addressZip || ''}
                                            onChange={(e) => setLocationFormData(prev => ({ ...prev, addressZip: e.target.value }))}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                            placeholder="123-4567"
                                            maxLength={8}
                                        />
                                    </div>

                                    {/* 都道府県 & 市区町村 */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">都道府県</label>
                                            <input
                                                type="text"
                                                value={locationFormData.addressPref || ''}
                                                onChange={(e) => setLocationFormData(prev => ({ ...prev, addressPref: e.target.value }))}
                                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                                placeholder="東京都"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">市区町村・番地</label>
                                            <input
                                                type="text"
                                                value={locationFormData.addressCity || ''}
                                                onChange={(e) => setLocationFormData(prev => ({ ...prev, addressCity: e.target.value }))}
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
                                            value={locationFormData.url || ''}
                                            onChange={(e) => setLocationFormData(prev => ({ ...prev, url: e.target.value }))}
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
                                                onClick={() => handleLocationCoordinateSearch()}
                                                className="text-[9px] text-sky-600 font-bold hover:underline"
                                            >
                                                住所から取得
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={locationFormData.coordsInput}
                                            onChange={(e) => handleLocationCoordsInputChange(e.target.value)}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all text-sm font-medium"
                                            placeholder="35.6895, 139.6917"
                                        />
                                    </div>

                                    {/* 地図プレビュー */}
                                    <div className="w-full aspect-video rounded-2xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50 relative">
                                        <LeafletMap
                                            lat={locationFormData.latitude || 35.6895}
                                            lng={locationFormData.longitude || 139.6917}
                                            height="100%"
                                        />
                                        {!locationFormData.latitude && (
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
                                            value={locationFormData.note || ''}
                                            onChange={(e) => setLocationFormData(prev => ({ ...prev, note: e.target.value }))}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all text-sm font-medium h-24 resize-none"
                                            placeholder="例えば、最寄り駅や特徴を入力してください。"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                {editingLocation && (
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteLocation(editingLocation)}
                                        className="flex-[1] flex items-center justify-center gap-2 py-4 rounded-2xl text-red-500 font-bold border-2 border-red-50 hover:bg-red-50 transition-all active:scale-95 text-xs"
                                    >
                                        <Trash2 size={16} />
                                        ロケーションを削除
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={locationSaving}
                                    className="flex-[2] bg-sky-600 text-white py-4 rounded-2xl hover:bg-sky-700 transition-all font-bold shadow-xl shadow-sky-100 active:scale-95 disabled:opacity-50 h-14"
                                >
                                    {locationSaving ? (
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
