"use client";

import { useState } from 'react';
import { X, Check, Tag, MapPin, User, Calendar, Type, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/admin/AuthProvider';
import { bulkUpdatePhotos, searchCoordinatesAction } from '@/lib/actions/photos';
import { motion, AnimatePresence } from 'framer-motion';
import LeafletMap from '@/components/common/LeafletMap';

interface BulkEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedIds: Set<string>;
    onUpdateComplete: () => void;
}

export default function BulkEditModal({ isOpen, onClose, selectedIds, onUpdateComplete }: BulkEditModalProps) {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form States
    const [title, setTitle] = useState('');
    const [subjectName, setSubjectName] = useState('');
    const [location, setLocation] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [shotAt, setShotAt] = useState('');
    const [event, setEvent] = useState('');
    const [characterName, setCharacterName] = useState('');
    const [displayMode, setDisplayMode] = useState<'title' | 'character' | ''>('');
    const [address, setAddress] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [coordsInput, setCoordsInput] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [prefecture, setPrefecture] = useState('');
    const [generalAddressInput, setGeneralAddressInput] = useState('');
    const [locationCandidates, setLocationCandidates] = useState<any[]>([]);
    const [searchError, setSearchError] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [showLocationConfirm, setShowLocationConfirm] = useState(false);
    const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!user) return;

        if (selectedIds.size === 0) {
            onClose();
            return;
        }

        // ロケーション変更がある場合、確認を求める
        const hasLocationChange = location.trim() || address.trim() || latitude.trim() || longitude.trim() || zipCode.trim() || prefecture.trim();
        if (hasLocationChange && !isLocationConfirmed) {
            setShowLocationConfirm(true);
            return;
        }

        setIsSubmitting(true);
        try {
            const token = await user.getIdToken();
            const data: any = {};

            // Only include fields that have values (to avoid overwriting with empty)
            // Note: If user specifically WANTS to clear a field, we might need a different UI (e.g. checkboxes to "apply")
            // For now, only non-empty strings are updated.
            if (title.trim()) data.title = title.trim();
            if (subjectName.trim()) data.subjectName = subjectName.trim();
            if (location.trim()) data.location = location.trim();
            if (tagsInput.trim()) data.tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
            if (shotAt) data.shotAt = shotAt; // YYYY-MM-DD 形式のままサーバーへ
            if (event.trim()) data.event = event.trim();
            if (characterName.trim()) data.characterName = characterName.trim();
            if (displayMode) data.displayMode = displayMode;
            if (address.trim()) data.address = address.trim();
            if (latitude.trim()) data.latitude = parseFloat(latitude);
            if (longitude.trim()) data.longitude = parseFloat(longitude);
            if (zipCode.trim()) data.zipCode = zipCode.trim();
            if (prefecture.trim()) data.prefecture = prefecture.trim();

            if (Object.keys(data).length === 0) {
                alert('変更する項目を入力してください。');
                setIsSubmitting(false);
                return;
            }

            const result = await bulkUpdatePhotos(Array.from(selectedIds), data, token);

            if (result.success) {
                alert(`${result.count}枚の写真を更新しました。`);
                onUpdateComplete();
                onClose();
            } else {
                alert(`エラーが発生しました: ${result.error}`);
            }
        } catch (error: any) {
            console.error('Bulk update error:', error);
            alert(`エラーが発生しました: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddressParse = (input: string) => {
        setGeneralAddressInput(input);
        if (!input.trim()) return;

        // 郵便番号: 〒060-0063 or 060-0063 or 0600063
        const zipMatch = input.match(/(?:〒?\s?)(\d{3}-\d{4}|\d{7})/);
        const zip = zipMatch ? (zipMatch[1].includes('-') ? zipMatch[1] : `${zipMatch[1].slice(0, 3)}-${zipMatch[1].slice(3)}`) : '';
        if (zip) setZipCode(zip);

        // 都道府県
        const prefMatch = input.match(/(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/);
        const pref = prefMatch ? prefMatch[1] : '';
        if (pref) setPrefecture(pref);

        // 住所 (都道府県の後の部分、または郵便番号や特定のキーワードを除去した残り)
        let addr = input;
        if (zipMatch) addr = addr.replace(zipMatch[0], '');
        if (prefMatch) addr = addr.replace(prefMatch[0], '');

        // 残った文字列から施設名らしきもの(最初の空白より前など)を調整しても良いが、
        // ユーザーの例「北海道札幌市中央区 南3条西1丁目15」では「札幌市中央区 南3条西1丁目15」が残る
        addr = addr.replace(/^[\s　,]+|[\s　,]+$/g, ''); // 前後の空白削除
        if (addr) setAddress(addr);
    };

    const handleLocationSearch = async () => {
        const query = [zipCode, prefecture, address, location].filter(Boolean).join(' ');
        if (!query.trim()) {
            setSearchError('検索キーワードを入力してください。');
            return;
        }

        setIsSearching(true);
        setSearchError('');
        setLocationCandidates([]);

        try {
            const results = await searchCoordinatesAction(query);
            if (results && results.length > 0) {
                if (results.length === 1) {
                    const res = results[0];
                    setLatitude(res.lat.toString());
                    setLongitude(res.lng.toString());
                    setCoordsInput(`${res.lat}, ${res.lng}`);
                    if (res.displayName) setAddress(res.displayName);
                } else {
                    setLocationCandidates(results);
                }
            } else {
                setSearchError('候補が見つかりませんでした。別の言葉（住所、施設名、郵便番号など）を試してください。');
            }
        } catch (err) {
            console.error('Search error:', err);
            setSearchError('位置情報の取得中にエラーが発生しました。');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-neutral-800">
                    <h3 className="text-xl font-bold text-white">
                        一括編集 ({selectedIds.size}枚)
                    </h3>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5">
                    <div className="bg-blue-900/20 border border-blue-800/50 p-3 rounded-xl mb-4 text-center">
                        <p className="text-xs font-bold text-blue-400">
                            ✨ 入力した項目のみ一括更新されます。
                        </p>
                        <p className="text-[10px] text-blue-500/70 mt-1">
                            空欄のままの項目は、写真の元の情報が維持されます。
                        </p>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                            <Type className="w-4 h-4" /> タイトル (Title)
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600 placeholder:italic"
                            placeholder="── 変更しない ──"
                        />
                    </div>

                    {/* Model / Subject */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                            <User className="w-4 h-4" /> モデル名 (Subject/Model)
                        </label>
                        <input
                            type="text"
                            value={subjectName}
                            onChange={(e) => setSubjectName(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600 placeholder:italic"
                            placeholder="── 変更しない ──"
                        />
                    </div>

                    {/* General Address Input (Smart Parsing) */}
                    <div className="p-4 bg-amber-900/10 border border-amber-800/30 rounded-xl space-y-2">
                        <label className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-2">
                            <Sparkles className="w-3 h-3" /> 規定住所一括入力 (Smart Parse)
                        </label>
                        <textarea
                            value={generalAddressInput}
                            onChange={(e) => handleAddressParse(e.target.value)}
                            className="w-full bg-neutral-900/50 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-500 outline-none transition-all placeholder:text-neutral-700"
                            placeholder="例: 〒 XXX-XXXX 蝦夷地 ノトカリ市 モシリ野 7-4"
                            rows={2}
                        />
                        <p className="text-[9px] text-amber-600/70">※ 貼り付けると郵便番号、都道府県、住所が自動抽出されます。</p>
                    </div>

                    {/* Location & Address Group */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> 郵便番号 (Zip)
                            </label>
                            <input
                                type="text"
                                value={zipCode}
                                onChange={(e) => setZipCode(e.target.value)}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600 placeholder:italic"
                                placeholder="── 変更しない ──"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> 都道府県 (Pref)
                            </label>
                            <input
                                type="text"
                                value={prefecture}
                                onChange={(e) => setPrefecture(e.target.value)}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600 placeholder:italic"
                                placeholder="── 変更しない ──"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> 住所 (Address)
                        </label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600 placeholder:italic"
                            placeholder="── 変更しない ──"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> 撮影場所名 (Location)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600 placeholder:italic"
                                placeholder="── 変更しない ──"
                            />
                            <button
                                type="button"
                                onClick={handleLocationSearch}
                                disabled={isSearching}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 disabled:opacity-50 transition-colors"
                            >
                                {isSearching ? '検索中' : '検索'}
                            </button>
                        </div>
                        {searchError && (
                            <p className="text-[10px] text-red-400 font-bold mt-1">⚠️ {searchError}</p>
                        )}
                    </div>

                    {/* ✅ ロケーション候補選択 */}
                    {locationCandidates.length > 0 && (
                        <div className="p-3 bg-blue-900/30 border border-blue-800 rounded-xl space-y-2">
                            <p className="text-[10px] font-bold text-blue-400 flex items-center gap-1.5 mb-1">
                                <MapPin className="w-3 h-3" />
                                該当する撮影場所を選んでください
                            </p>
                            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {locationCandidates.map((cand, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            setLatitude(cand.lat.toString());
                                            setLongitude(cand.lng.toString());
                                            setCoordsInput(`${cand.lat}, ${cand.lng}`);
                                            setAddress(cand.displayName);
                                            setLocationCandidates([]);
                                        }}
                                        className="w-full text-left p-2 rounded-lg bg-neutral-800 border border-neutral-700 hover:border-blue-500 transition-all group"
                                    >
                                        <div className="text-[10px] font-bold text-white group-hover:text-blue-400 truncate">
                                            {cand.displayName}
                                        </div>
                                        <div className="text-[8px] text-neutral-500 mt-0.5">
                                            {cand.lat.toFixed(5)}, {cand.lng.toFixed(5)} ({cand.type || 'unknown'})
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Coordinates Group */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-400" /> 座標 (緯度, 経度)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={coordsInput}
                                onChange={(e) => setCoordsInput(e.target.value)}
                                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-[10px] text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600 placeholder:italic font-mono"
                                placeholder="── 変更しない ──"
                            />
                            <button
                                type="button"
                                onClick={async () => {
                                    // 1. まず座標入力欄（北... 東... など）の解析を試みる
                                    if (coordsInput.trim()) {
                                        const parts = coordsInput.split(/[,，]/);
                                        if (parts.length >= 2) {
                                            const parseCoord = (s: string, negChar: string) => {
                                                const num = parseFloat(s.replace(/[^\d.-]/g, ''));
                                                return s.includes(negChar) ? -Math.abs(num) : num;
                                            };
                                            const la = parseCoord(parts[0], '南');
                                            const ln = parseCoord(parts[1], '西');
                                            if (!isNaN(la) && !isNaN(ln)) {
                                                setLatitude(la.toString());
                                                setLongitude(ln.toString());
                                                setCoordsInput(`${la}, ${ln}`); // 正規化して表示
                                                return; // 解析できたら終了
                                            }
                                        }
                                    }

                                    // 2. 座標欄が空、または解析不能な場合は住所から検索
                                    handleLocationSearch();
                                }}
                                disabled={isSearching}
                                className={`px-4 py-3 bg-blue-900/30 text-blue-400 border border-blue-800 rounded-lg text-[10px] font-bold hover:bg-blue-900/50 transition-all ${isSearching ? 'opacity-50' : ''}`}
                            >
                                {isSearching ? '反映中...' : '反映 & 座標取得'}
                            </button>
                        </div>
                    </div>

                    {/* ✅ マッププレビュー */}
                    {(() => {
                        const latNum = parseFloat(latitude);
                        const lngNum = parseFloat(longitude);
                        const isValid = !isNaN(latNum) && !isNaN(lngNum) && latitude !== '' && longitude !== '';

                        if (isValid) {
                            return (
                                <div className="mt-4 group/map relative">
                                    <LeafletMap
                                        lat={latNum}
                                        lng={lngNum}
                                        height="200px"
                                        className="rounded-2xl overflow-hidden shadow-lg border border-neutral-800"
                                    />
                                    <div className="absolute top-3 left-3 z-[1000] px-3 py-1.5 bg-neutral-900/90 backdrop-blur-md rounded-xl text-[10px] font-bold text-neutral-300 border border-neutral-800 shadow-sm pointer-events-none flex items-center gap-1.5">
                                        <MapPin className="w-3 h-3 text-blue-500" />
                                        Batch Preview
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div className="mt-4 p-4 border border-dashed border-neutral-800 rounded-xl bg-neutral-800/20 text-center">
                                <p className="text-[10px] text-neutral-500 italic">有効な座標が反映されるとここに地図が表示されます</p>
                            </div>
                        );
                    })()}
                    <p className="text-[9px] text-neutral-500 italic mt-2">※ 「座標取得」ボタンで住所・場所名からGPS座標を反映できます。座標の直接入力も可能です。</p>

                    {/* Tags */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                            <Tag className="w-4 h-4" /> タグ (Tags)
                        </label>
                        <input
                            type="text"
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600 placeholder:italic"
                            placeholder="── 変更しない ──"
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> 撮影日 (Shot At)
                        </label>
                        <div className="relative group">
                            <input
                                type="text"
                                value={shotAt}
                                onChange={(e) => setShotAt(e.target.value)}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600 placeholder:italic"
                                placeholder="── 変更しない ── (例: 2024-01-01)"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <input
                                    type="date"
                                    onChange={(e) => setShotAt(e.target.value)}
                                    className="opacity-0 absolute inset-0 cursor-pointer pointer-events-auto w-full"
                                    title="カレンダーから選択"
                                />
                                <Calendar className="w-4 h-4 text-neutral-500 group-hover:text-blue-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Event Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                            <Tag className="w-4 h-4 text-indigo-400" /> イベント名 (Event Name)
                        </label>
                        <input
                            type="text"
                            value={event}
                            onChange={(e) => setEvent(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600 placeholder:italic"
                            placeholder="── 変更しない ──"
                        />
                    </div>

                    {/* Character Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                            <User className="w-4 h-4 text-pink-400" /> キャラクター名 (Character)
                        </label>
                        <input
                            type="text"
                            value={characterName}
                            onChange={(e) => setCharacterName(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600 placeholder:italic"
                            placeholder="── 変更しない ──"
                        />
                    </div>

                    {/* Display Mode */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                            <Type className="w-4 h-4 text-amber-400" /> 表示優先 (Display Mode)
                        </label>
                        <select
                            value={displayMode}
                            onChange={(e) => setDisplayMode(e.target.value as any)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'white\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                        >
                            <option value="">── 変更しない ──</option>
                            <option value="title">タイトル表示 (A)</option>
                            <option value="character">キャラクター名表示 (B)</option>
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-neutral-800 flex justify-end gap-3 bg-neutral-900/50">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-bold text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                    >
                        <Check className="w-5 h-5" />
                        {isSubmitting ? '更新中...' : '変更を適用'}
                    </button>
                </div>
            </div>

            {/* ✅ ロケーション確認用オーバーレイ */}
            <AnimatePresence>
                {showLocationConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 text-center space-y-6">
                                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto ring-8 ring-blue-500/5">
                                    <MapPin className="w-8 h-8 text-blue-400" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xl font-black text-white italic tracking-tight">Location Verification</h4>
                                    <p className="text-sm text-neutral-400 font-medium">この住所・位置情報で間違いありませんか？</p>
                                </div>

                                <div className="bg-neutral-800/50 rounded-2xl p-5 border border-white/5 space-y-4">
                                    <div className="text-left space-y-3">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Address / Info</span>
                                            <p className="text-xs text-white leading-relaxed font-bold">
                                                {address || location || '住所が入力されていません'}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-neutral-500 uppercase">Zip Code</span>
                                                <p className="text-xs text-white font-mono">{zipCode || '-'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-neutral-500 uppercase">Prefecture</span>
                                                <p className="text-xs text-white font-bold">{prefecture || '-'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {latitude && longitude && (
                                        <div className="w-full h-32 rounded-xl overflow-hidden border border-white/10 ring-1 ring-white/5 shadow-inner">
                                            <LeafletMap
                                                lat={parseFloat(latitude)}
                                                lng={parseFloat(longitude)}
                                                height="128px"
                                                className="w-full h-full"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        onClick={() => setShowLocationConfirm(false)}
                                        className="py-4 rounded-2xl font-bold text-neutral-500 hover:text-white hover:bg-white/5 transition-all text-sm active:scale-95"
                                    >
                                        いいえ、修正
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsLocationConfirmed(true);
                                            setShowLocationConfirm(false);
                                            // 少し待ってから再送信（ステート反映のため）
                                            setTimeout(() => {
                                                handleSubmit();
                                            }, 50);
                                        }}
                                        className="py-4 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                                    >
                                        はい、正しい
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
