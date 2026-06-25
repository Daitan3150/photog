'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getPublicModels } from '@/lib/actions/users';
import { saveSubject } from '@/lib/actions/subjects';
import { Search, Plus, Check } from 'lucide-react';

interface SubjectSelectProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    required?: boolean;
}

export default function SubjectSelect({
    value,
    onChange,
    label = "被写体名",
    placeholder = "被写体名を選択または入力...",
    required = false
}: SubjectSelectProps) {
    const [models, setModels] = useState<{ displayName: string }[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        let isMounted = true;
        const fetchModels = async () => {
            setLoading(true);
            try {
                const res = await getPublicModels();
                if (res.success && res.models && isMounted) {
                    setModels(res.models);
                }
            } catch (err) {
                console.error("Failed to fetch models", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchModels();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // On blur, if it doesn't match and not saving, we just keep the string
                onChange(inputValue); 
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, [inputValue, onChange]);

    const filteredModels = models.filter(m => 
        m.displayName.toLowerCase().includes(inputValue.toLowerCase())
    );

    const exactMatch = models.find(m => m.displayName === inputValue);

    const handleSelect = (name: string) => {
        setInputValue(name);
        onChange(name);
        setIsOpen(false);
    };

    const handleAddNew = async () => {
        if (!inputValue.trim() || exactMatch) return;
        setIsSaving(true);
        try {
            const res = await saveSubject({ name: inputValue.trim() });
            if (res.success) {
                // Update local models list
                setModels(prev => [...prev, { displayName: inputValue.trim() }]);
                handleSelect(inputValue.trim());
            } else {
                alert(res.error || '被写体の追加に失敗しました。');
            }
        } catch (err: any) {
            alert(err.message || 'エラーが発生しました。');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-1.5 relative" ref={wrapperRef}>
            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block">
                {label} {required && '*'}
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
                    required={required}
                />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-sm text-gray-400">読み込み中...</div>
                    ) : (
                        <div className="py-2">
                            {filteredModels.length > 0 ? (
                                filteredModels.map((model, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSelect(model.displayName)}
                                        className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-sm flex items-center justify-between transition-colors"
                                    >
                                        <span className="font-medium text-gray-700">{model.displayName}</span>
                                        {value === model.displayName && <Check className="h-4 w-4 text-indigo-500" />}
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-2 text-sm text-gray-400">候補が見つかりません</div>
                            )}

                            {inputValue.trim() && !exactMatch && (
                                <div className="border-t border-gray-100 mt-2 p-2">
                                    <button
                                        type="button"
                                        onClick={handleAddNew}
                                        disabled={isSaving}
                                        className="w-full flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors text-sm font-bold disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <span className="animate-pulse flex items-center gap-2">
                                                <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                登録中...
                                            </span>
                                        ) : (
                                            <>
                                                <Plus size={16} />
                                                「{inputValue}」を新規被写体として登録
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
