'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/admin/AuthProvider';
import { getCameras, saveCamera, updateCamera, deleteCamera } from '@/lib/actions/cameras';
import { Camera, CameraFormData } from '@/types/camera';
import { CAMERA_TYPE_LABELS, CameraType } from '@/lib/photos/inferCameraType';
import { Plus, Edit2, Trash2, X, AlertTriangle, Check, Camera as CameraIcon } from 'lucide-react';

export default function AdminCamerasPage() {
    const { user, role } = useAuth();
    const isAdmin = role === 'admin';
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
    const [formData, setFormData] = useState<CameraFormData>({
        make: '',
        name: '',
        type: 'mirrorless',
        sensorSize: 'フルサイズ',
        releasedYear: null,
        isRegistered: true
    });
    const [releasedYearInput, setReleasedYearInput] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // 未登録検出されたカメラのリスト
    const unregisteredCameras = cameras.filter(c => !c.isRegistered);
    // 正式登録済みのカメラのリスト
    const registeredCameras = cameras.filter(c => c.isRegistered);

    useEffect(() => {
        if (user) {
            fetchCameras();
        }
    }, [user]);

    const fetchCameras = async () => {
        setLoading(true);
        try {
            const list = await getCameras();
            setCameras(list);
        } catch (err) {
            console.error('Failed to fetch cameras:', err);
        }
        setLoading(false);
    };

    const handleOpenModal = (camera: Camera | null = null) => {
        if (camera) {
            setEditingCamera(camera);
            setFormData({
                make: camera.make,
                name: camera.name,
                type: camera.type,
                sensorSize: camera.sensorSize || 'フルサイズ',
                releasedYear: camera.releasedYear ?? null,
                isRegistered: true // 登録・編集する際は登録済み状態(true)にする
            });
            setReleasedYearInput(camera.releasedYear ? String(camera.releasedYear) : '');
        } else {
            setEditingCamera(null);
            setFormData({
                make: '',
                name: '',
                type: 'mirrorless',
                sensorSize: 'フルサイズ',
                releasedYear: null,
                isRegistered: true
            });
            setReleasedYearInput('');
        }
        setError('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCamera(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.make.trim() || !formData.name.trim()) {
            setError('メーカー名とカメラ名は必須です。');
            return;
        }

        setIsSaving(true);
        setError('');

        const year = releasedYearInput.trim() ? parseInt(releasedYearInput, 10) : null;
        if (releasedYearInput.trim() && isNaN(year || 0)) {
            setError('発売年は数値で入力してください。');
            setIsSaving(false);
            return;
        }

        const dataToSave: CameraFormData = {
            ...formData,
            releasedYear: year,
            isRegistered: true // 登録完了フラグを立てる
        };

        try {
            const token = await user?.getIdToken();
            if (!token) {
                setError('認証エラー: 再ログインしてください。');
                setIsSaving(false);
                return;
            }

            let result;
            if (editingCamera?.id) {
                result = await updateCamera(editingCamera.id, dataToSave, token);
            } else {
                result = await saveCamera(dataToSave, token);
            }

            if (result.success) {
                await fetchCameras();
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

    const handleDelete = async (camera: Camera) => {
        if (!confirm(`「${camera.make} ${camera.name}」を削除してもよろしいですか？\nこの操作は取り消せません。`)) return;

        try {
            const token = await user?.getIdToken();
            if (!token) {
                alert('認証エラー: 再ログインしてください。');
                return;
            }

            const result = await deleteCamera(camera.id as string, token);
            if (result.success) {
                await fetchCameras();
            } else {
                alert(result.error || '削除中にエラーが発生しました。');
            }
        } catch (err) {
            alert('削除中にエラーが発生しました。');
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-6xl mx-auto py-10 px-4 md:px-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        <CameraIcon className="text-slate-800" size={32} />
                        カメラマスタ管理
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        撮影に使用したカメラ（ミラーレス一眼・コンパクトカメラ等）を登録し、写真データと紐付けます。
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all font-bold shadow-lg shadow-slate-100 active:scale-95"
                    >
                        <Plus size={20} />
                        新規カメラ登録
                    </button>
                )}
            </header>

            {/* 未登録カメラの検出通知（アラート） */}
            {unregisteredCameras.length > 0 && (
                <div className="mb-10 relative overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-3xl p-6 md:p-8 shadow-sm">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <CameraIcon size={120} className="text-amber-800" />
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-200">
                            <AlertTriangle size={24} />
                        </div>
                        <div className="space-y-4 flex-grow">
                            <div>
                                <h3 className="text-lg font-bold text-amber-900">未登録のカメラを検出しました</h3>
                                <p className="text-sm text-amber-700/80 mt-1">
                                    アップロードされた写真のEXIF情報から、マスタに登録されていない型番が {unregisteredCameras.length} 件検出されました。情報を補正して登録してください。
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {unregisteredCameras.map(camera => (
                                    <div 
                                        key={camera.id}
                                        onClick={() => handleOpenModal(camera)}
                                        className="flex items-center justify-between p-4 bg-white border border-amber-200/40 rounded-2xl hover:border-amber-500/60 hover:shadow-md cursor-pointer transition-all group"
                                    >
                                        <div className="min-w-0">
                                            <span className="text-[10px] uppercase tracking-wider text-amber-600 font-bold bg-amber-100/50 px-2 py-0.5 rounded-md">{camera.make || 'メーカー不明'}</span>
                                            <h4 className="text-sm font-bold text-slate-800 mt-1 truncate">{camera.name}</h4>
                                        </div>
                                        <button className="flex items-center gap-1 text-xs font-bold text-amber-600 group-hover:text-amber-700 transition-colors">
                                            今すぐ登録 <ChevronRight size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-slate-800 rounded-full animate-spin" />
                </div>
            ) : registeredCameras.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <CameraIcon className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-500 font-medium">登録されているカメラはありません。</p>
                    {isAdmin && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="mt-4 text-slate-900 font-bold hover:underline"
                        >
                            最初のカメラを登録する
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {registeredCameras.length} 件の登録済みカメラ
                        </span>
                    </div>

                    {/* Camera Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {registeredCameras.map(camera => (
                            <div
                                key={camera.id}
                                className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 overflow-hidden group relative flex flex-col"
                            >
                                <div className="p-6 flex-grow">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{camera.make}</span>
                                            <h3 className="text-base font-bold text-slate-800 mt-1 truncate" title={camera.name}>{camera.name}</h3>
                                        </div>
                                        {isAdmin && (
                                            <div className="flex gap-1 flex-shrink-0">
                                                <button
                                                    onClick={() => handleOpenModal(camera)}
                                                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
                                                    title="編集"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(camera)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="削除"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Specifications */}
                                    <div className="mt-6 space-y-2">
                                        <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                                            <span className="text-slate-400">種類</span>
                                            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                                {CAMERA_TYPE_LABELS[camera.type] || camera.type}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                                            <span className="text-slate-400">センサーサイズ</span>
                                            <span className="font-bold text-slate-700">{camera.sensorSize || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs pb-1">
                                            <span className="text-slate-400">発売年</span>
                                            <span className="font-bold text-slate-700">
                                                {camera.releasedYear ? `${camera.releasedYear}年` : '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                        <header className="px-8 py-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingCamera ? (editingCamera.isRegistered ? 'カメラマスタの編集' : '新規カメラの登録') : 'カメラの新規追加'}
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

                            <div className="space-y-4">
                                {/* メーカー */}
                                <div className="space-y-2">
                                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">メーカー (必須)</label>
                                    <input
                                        type="text"
                                        value={formData.make}
                                        onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:bg-white outline-none transition-all text-sm font-medium"
                                        placeholder="例: SONY, Canon, Nikon, RICOH など"
                                        required
                                    />
                                </div>

                                {/* 名前・型番 */}
                                <div className="space-y-2">
                                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">カメラ名 / 型番 (必須)</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:bg-white outline-none transition-all text-sm font-medium"
                                        placeholder="例: ILCE-7M4, GR III, EOS R6 など"
                                        required
                                    />
                                </div>

                                {/* 種類 */}
                                <div className="space-y-2">
                                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">カメラの種類</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as CameraType })}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:bg-white outline-none transition-all text-sm font-medium"
                                    >
                                        {Object.entries(CAMERA_TYPE_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* センサーサイズ */}
                                <div className="space-y-2">
                                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">センサーサイズ</label>
                                    <input
                                        type="text"
                                        value={formData.sensorSize}
                                        onChange={(e) => setFormData({ ...formData, sensorSize: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:bg-white outline-none transition-all text-sm font-medium"
                                        placeholder="例: フルサイズ, APS-C, 1インチ, 中判, 35mmフィルム など"
                                    />
                                </div>

                                {/* 発売年 */}
                                <div className="space-y-2">
                                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">発売年 (任意)</label>
                                    <input
                                        type="text"
                                        value={releasedYearInput}
                                        onChange={(e) => setReleasedYearInput(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:bg-white outline-none transition-all text-sm font-medium"
                                        placeholder="例: 2021"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 py-4 rounded-2xl text-slate-500 font-bold border-2 border-slate-50 hover:bg-slate-50 transition-all active:scale-95 text-xs"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-2 bg-slate-900 text-white py-4 rounded-2xl hover:bg-slate-800 transition-all font-bold shadow-xl active:scale-95 disabled:opacity-50 h-14"
                                >
                                    {isSaving ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                                    ) : (
                                        editingCamera ? (editingCamera.isRegistered ? '変更を保存する' : '登録を完了する') : '新しく追加する'
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

function ChevronRight({ size, className }: { size?: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m9 18 6-6-6-6"/>
        </svg>
    );
}
