"use client";

import { useState } from 'react';
import { X, Check, Tag, MapPin, User, Calendar, Type } from 'lucide-react';
import { useAuth } from '@/components/admin/AuthProvider';
import { bulkUpdatePhotos } from '@/lib/actions/photos';

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

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (selectedIds.size === 0) {
            onClose();
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
                    <p className="text-sm text-neutral-400 mb-4">
                        入力した項目のみ更新されます。空欄の項目は変更されません。
                    </p>

                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                            <Type className="w-4 h-4" /> タイトル (Title)
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600"
                            placeholder="一括設定するタイトル..."
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
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600"
                            placeholder="例: Model Name"
                        />
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> 撮影場所 (Location)
                        </label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600"
                            placeholder="例: Tokyo, Shibuya"
                        />
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                            <Tag className="w-4 h-4" /> タグ (Tags)
                        </label>
                        <input
                            type="text"
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600"
                            placeholder="カンマ区切り (例: portrait, night, street)"
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> 撮影日 (Shot At)
                        </label>
                        <input
                            type="date"
                            value={shotAt}
                            onChange={(e) => setShotAt(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all [color-scheme:dark]"
                        />
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
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600"
                            placeholder="例: コミケ105"
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
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-neutral-600"
                            placeholder="例: 博麗霊夢"
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
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            <option value="">変更しない</option>
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
        </div>
    );
}
