'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    AiMemory,
    AiMemoryCategory,
    AiSuggestion,
    askLocalAiLab,
    deleteAiMemory,
    getAiMemories,
    saveAiMemory,
    updateAiMemory,
} from '@/lib/actions/aiLab';
import { inferAiMemoryCategory } from '@/lib/aiLab/inferMemoryCategory';
import { useAuth } from '@/components/admin/AuthProvider';
import { Brain, CheckCircle2, Lightbulb, Pencil, Plus, Save, Send, Trash2, X } from 'lucide-react';

const categoryOptions: { value: AiMemoryCategory; label: string; tone: string }[] = [
    { value: 'preference', label: '好み', tone: 'bg-pink-50 text-pink-700 border-pink-100' },
    { value: 'site_rule', label: 'サイトルール', tone: 'bg-blue-50 text-blue-700 border-blue-100' },
    { value: 'writing_style', label: '文体', tone: 'bg-amber-50 text-amber-700 border-amber-100' },
    { value: 'feature_idea', label: '機能案', tone: 'bg-violet-50 text-violet-700 border-violet-100' },
    { value: 'workflow', label: '作業手順', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { value: 'note', label: 'メモ', tone: 'bg-slate-50 text-slate-700 border-slate-100' },
];

const emptyForm = {
    title: '',
    content: '',
    category: 'preference' as AiMemoryCategory,
    priority: 3,
};

function categoryMeta(category: AiMemoryCategory) {
    return categoryOptions.find(option => option.value === category) || categoryOptions[categoryOptions.length - 1];
}

export default function AiLabPage() {
    const { role } = useAuth();
    const [memories, setMemories] = useState<AiMemory[]>([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [thinking, setThinking] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [categoryLocked, setCategoryLocked] = useState(false);

    const categoryInference = useMemo(
        () => inferAiMemoryCategory(form.title, form.content),
        [form.title, form.content],
    );

    useEffect(() => {
        if (categoryLocked || editingId) return;
        if (!form.title.trim() && !form.content.trim()) return;
        setForm(prev => (prev.category === categoryInference.category ? prev : { ...prev, category: categoryInference.category }));
    }, [categoryInference.category, categoryLocked, editingId, form.title, form.content]);

    const usedMemorySet = useMemo(() => new Set(suggestion?.usedMemories || []), [suggestion]);

    const isAdmin = role === 'admin';

    const refreshMemories = async () => {
        const result = await getAiMemories();
        if (result.success) {
            setMemories(result.data);
        } else {
            setError(result.error || '記憶の読み込みに失敗しました。');
        }
    };

    useEffect(() => {
        let ignore = false;

        Promise.resolve().then(async () => {
            if (isAdmin) {
                const result = await getAiMemories();
                if (!ignore && result.success) {
                    setMemories(result.data);
                } else if (!ignore) {
                    setError(result.error || '記憶の読み込みに失敗しました。');
                }
            }

            if (!ignore) setLoading(false);
        });

        return () => {
            ignore = true;
        };
    }, [isAdmin]);

    if (!isAdmin) {
        return (
            <div className="max-w-3xl mx-auto bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-5">
                    <Brain size={24} />
                </div>
                <h1 className="text-2xl font-black text-slate-900">AI Lab</h1>
                <p className="text-sm text-slate-500 mt-2">この機能は管理者専用です。</p>
            </div>
        );
    }

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
        setCategoryLocked(false);
    };

    const handleSaveMemory = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');

        const result = editingId
            ? await updateAiMemory(editingId, form)
            : await saveAiMemory(form);

        if (result.success) {
            setMessage(editingId ? '記憶を更新しました。' : '新しい記憶を追加しました。');
            resetForm();
            await refreshMemories();
        } else {
            setError(result.error || '保存に失敗しました。');
        }

        setSaving(false);
    };

    const handleEdit = (memory: AiMemory) => {
        setEditingId(memory.id);
        setCategoryLocked(true);
        setForm({
            title: memory.title,
            content: memory.content,
            category: memory.category,
            priority: memory.priority,
        });
    };

    const handleDelete = async (memory: AiMemory) => {
        if (!confirm(`「${memory.title}」を削除しますか？`)) return;
        setError('');
        setMessage('');
        const result = await deleteAiMemory(memory.id);
        if (result.success) {
            setMessage('記憶を削除しました。');
            if (editingId === memory.id) resetForm();
            await refreshMemories();
        } else {
            setError(result.error || '削除に失敗しました。');
        }
    };

    const handleAsk = async (event: React.FormEvent) => {
        event.preventDefault();
        setThinking(true);
        setError('');
        setMessage('');

        const result = await askLocalAiLab(prompt);
        if (result.success && result.suggestion) {
            setSuggestion(result.suggestion);
        } else {
            setError(result.error || '提案を作れませんでした。');
        }

        setThinking(false);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 mb-3">
                        <Brain size={14} />
                        Local AI Lab
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">AI Lab</h1>
                    <p className="text-sm text-slate-500 mt-2">
                        外部AIに依存せず、保存した記憶からサイト運用や機能追加の提案を作ります。
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:min-w-64">
                    <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
                        <div className="text-2xl font-black text-slate-900">{memories.length}</div>
                        <div className="text-xs font-bold text-slate-400 mt-1">保存済み記憶</div>
                    </div>
                    <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
                        <div className="text-2xl font-black text-slate-900">0</div>
                        <div className="text-xs font-bold text-slate-400 mt-1">外部API使用</div>
                    </div>
                </div>
            </header>

            {(message || error) && (
                <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
                    {error || message}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                <section className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="font-black text-slate-900">相談する</h2>
                            <p className="text-xs text-slate-400 mt-1">記憶を参照して、次にやることを整理します。</p>
                        </div>
                        <Lightbulb className="text-amber-400" size={22} />
                    </div>
                    <form onSubmit={handleAsk} className="p-5 space-y-4">
                        <textarea
                            value={prompt}
                            onChange={event => setPrompt(event.target.value)}
                            rows={5}
                            placeholder="例: モデル管理に次に追加すると便利な機能を考えて"
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 resize-none"
                        />
                        <button
                            type="submit"
                            disabled={thinking || !prompt.trim()}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={16} />
                            {thinking ? '考え中...' : '提案を作る'}
                        </button>
                    </form>

                    {suggestion && (
                        <div className="border-t border-slate-100 p-5 bg-slate-50/70">
                            <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                        <Brain size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-black text-slate-900">{suggestion.title}</h3>
                                        <p className="whitespace-pre-line text-sm leading-7 text-slate-600 mt-3">{suggestion.body}</p>
                                    </div>
                                </div>
                                <div className="mt-5">
                                    <div className="text-xs uppercase tracking-widest font-black text-slate-400 mb-3">Next Steps</div>
                                    <div className="space-y-2">
                                        {suggestion.nextSteps.map(step => (
                                            <div key={step} className="flex items-start gap-2 text-sm text-slate-700">
                                                <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                                                <span>{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                <section className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="font-black text-slate-900">{editingId ? '記憶を編集' : '記憶を追加'}</h2>
                            <p className="text-xs text-slate-400 mt-1">使うほど提案があなたのサイト向けになります。</p>
                        </div>
                        {editingId ? (
                            <button type="button" onClick={resetForm} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                                <X size={18} />
                            </button>
                        ) : (
                            <Plus className="text-indigo-500" size={22} />
                        )}
                    </div>
                    <form onSubmit={handleSaveMemory} className="p-5 space-y-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1.5">タイトル</label>
                            <input
                                value={form.title}
                                onChange={event => setForm({ ...form, title: event.target.value })}
                                placeholder="例: 写真説明は短く余白を残す"
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
                            <div>
                                <label className="block text-xs font-black text-slate-500 mb-1.5">カテゴリ</label>
                                <select
                                    value={form.category}
                                    onChange={event => {
                                        setCategoryLocked(true);
                                        setForm({ ...form, category: event.target.value as AiMemoryCategory });
                                    }}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                                >
                                    {categoryOptions.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                {(form.title.trim() || form.content.trim()) && (
                                    <p className="text-[11px] text-indigo-600 font-bold mt-1.5">
                                        {categoryLocked
                                            ? '手動で選択中'
                                            : `自動判定: ${categoryInference.label}${categoryInference.confidence === 'high' ? '' : '（要確認）'}`}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 mb-1.5">重要度</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={form.priority}
                                    onChange={event => setForm({ ...form, priority: Number(event.target.value) })}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 mb-1.5">内容</label>
                            <textarea
                                value={form.content}
                                onChange={event => setForm({ ...form, content: event.target.value })}
                                rows={5}
                                placeholder="AI Labに覚えてほしい判断基準や好みを書いてください。"
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 resize-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={saving || !form.title.trim() || !form.content.trim()}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={16} />
                            {saving ? '保存中...' : editingId ? '記憶を更新' : '記憶を保存'}
                        </button>
                    </form>
                </section>
            </div>

            <section className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                    <h2 className="font-black text-slate-900">記憶一覧</h2>
                    <p className="text-xs text-slate-400 mt-1">間違った記憶は編集または削除できます。</p>
                </div>
                {loading ? (
                    <div className="p-10 flex justify-center">
                        <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
                    </div>
                ) : memories.length === 0 ? (
                    <div className="p-10 text-center text-sm text-slate-400">
                        まだ記憶がありません。まずは「好み」や「サイトルール」を1つ保存してください。
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {memories.map(memory => {
                            const meta = categoryMeta(memory.category);
                            return (
                                <article key={memory.id} className={`p-5 transition ${usedMemorySet.has(memory.id) ? 'bg-indigo-50/60' : 'bg-white'}`}>
                                    <div className="flex flex-col md:flex-row md:items-start gap-4 md:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${meta.tone}`}>
                                                    {meta.label}
                                                </span>
                                                <span className="text-[11px] font-bold text-slate-400">重要度 {memory.priority}</span>
                                                {usedMemorySet.has(memory.id) && (
                                                    <span className="text-[11px] font-black text-indigo-600">今回参照</span>
                                                )}
                                            </div>
                                            <h3 className="font-black text-slate-900">{memory.title}</h3>
                                            <p className="text-sm text-slate-600 leading-7 mt-2 whitespace-pre-line">{memory.content}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(memory)}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
                                            >
                                                <Pencil size={14} />
                                                編集
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(memory)}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 px-3 py-2 text-xs font-black text-red-500 hover:bg-red-50"
                                            >
                                                <Trash2 size={14} />
                                                削除
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
