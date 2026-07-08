'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/admin/AuthProvider';
import { getSubjects, saveSubject, updateSubject, deleteSubject, Subject } from '@/lib/actions/subjects';
import { getUsers, UserData } from '@/lib/actions/users';
import EditUserModel from '@/app/admin/users/EditUserModel';
import ResetPasswordForm from '@/app/admin/users/ResetPasswordForm';
import DeleteUserButton from '@/app/admin/users/DeleteUserButton';
import { Plus, X, Heart, Star, ChevronRight, Eye, EyeOff, Users, Mail, Hash, Images } from 'lucide-react';
import PartialDateInput from '@/components/admin/PartialDateInput';

const calculateAge = (birth: string, death?: string): number | null => {
    if (!birth) return null;
    const b = new Date(birth);
    if (isNaN(b.getTime())) return null;
    const d = death ? new Date(death) : new Date();
    if (isNaN(d.getTime())) return null;
    let age = d.getFullYear() - b.getFullYear();
    const m = d.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && d.getDate() < b.getDate())) age--;
    return age;
};

const formatDate = (dateStr: string) => dateStr ? dateStr.replace(/-/g, '.') : '';

// ===== 被写体 編集モーダル =====
function SubjectEditModal({
    subject,
    isNew,
    onClose,
    onSaved,
    onDeleted,
}: {
    subject: Partial<Subject> & { id?: string };
    isNew: boolean;
    onClose: () => void;
    onSaved: () => void;
    onDeleted?: () => void;
}) {
    const [form, setForm] = useState({
        name: subject.name || '',
        realName: subject.realName || '',
        birthday: subject.birthday || '',
        birthYear: subject.birthYear || (subject.birthday ? subject.birthday.split('-')[0] : ''),
        birthMonth: subject.birthMonth || (subject.birthday ? subject.birthday.split('-')[1] : ''),
        birthDay: subject.birthDay || (subject.birthday ? subject.birthday.split('-')[2] : ''),
        approximateAge: subject.approximateAge || '',
        deceasedDate: subject.deceasedDate || '',
        deceasedYear: subject.deceasedYear || (subject.deceasedDate ? subject.deceasedDate.split('-')[0] : ''),
        deceasedMonth: subject.deceasedMonth || (subject.deceasedDate ? subject.deceasedDate.split('-')[1] : ''),
        deceasedDay: subject.deceasedDay || (subject.deceasedDate ? subject.deceasedDate.split('-')[2] : ''),
        snsUrl: subject.snsUrl || '',
        notes: subject.notes || '',
    });
    const [showRealName, setShowRealName] = useState<boolean>(subject.showRealName === true);
    const [showBirthYear, setShowBirthYear] = useState<boolean>(subject.showBirthYear === true);
    const [showAge, setShowAge] = useState<boolean>(subject.showAge !== false);
    const [ageDisplayMode, setAgeDisplayMode] = useState<'blurred' | 'formal'>(subject.ageDisplayMode === 'formal' ? 'formal' : 'blurred');
    const [deceasedChecked, setDeceasedChecked] = useState(
        !!(subject.deceasedDate || subject.deceasedYear || subject.deceasedMonth)
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { setError('名前は必須です。'); return; }
        setSaving(true);
        setError('');
        try {
            // 生年月日の組み立て
            const hasBirth = form.birthYear && form.birthMonth && form.birthDay;
            const birthdayStr = hasBirth ? `${form.birthYear}-${form.birthMonth}-${form.birthDay}` : '';

            // 逝去日の組み立て
            const hasDeceased = deceasedChecked && form.deceasedYear && form.deceasedMonth && form.deceasedDay;
            const deceasedDateStr = hasDeceased ? `${form.deceasedYear}-${form.deceasedMonth}-${form.deceasedDay}` : '';

            const saveData = {
                ...form,
                birthday: birthdayStr,
                deceasedDate: deceasedDateStr,
                birthYear: form.birthYear || '',
                birthMonth: form.birthMonth || '',
                birthDay: form.birthDay || '',
                deceasedYear: deceasedChecked ? form.deceasedYear : '',
                deceasedMonth: deceasedChecked ? form.deceasedMonth : '',
                deceasedDay: deceasedChecked ? form.deceasedDay : '',
                showRealName: form.realName.trim() ? showRealName : false,
                showBirthYear,
                showAge,
                ageDisplayMode,
            };

            const result = isNew
                ? await saveSubject(saveData)
                : await updateSubject(subject.id!, saveData);
            if (result.success) {
                await onSaved();
                onClose();
            } else setError(result.error || '保存に失敗しました。');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!subject.id) return;
        if (!confirm(`「${form.name}」を削除しますか？この操作は取り消せません。`)) return;
        const result = await deleteSubject(subject.id);
        if (result.success) {
            if (onDeleted) await onDeleted();
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-10 h-1 bg-gray-200 rounded-full" />
                </div>

                <div className="px-7 pt-4 pb-2 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">
                        {isNew ? '新規登録' : '編集'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-xl hover:bg-gray-100">
                        <X size={22} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="px-7 pb-8 pt-3 space-y-4 overflow-y-auto max-h-[80vh]">
                    {error && <p className="text-red-600 text-xs font-bold bg-red-50 border border-red-100 p-3 rounded-xl">{error}</p>}

                    <div className="space-y-1.5">
                        <label className="text-xs uppercase tracking-widest font-bold text-gray-400 block">活動名・ニックネーム *</label>
                        <input
                            type="text" value={form.name} onChange={e => set('name', e.target.value)}
                            placeholder="例: さくら"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs uppercase tracking-widest font-bold text-gray-400 block">本名 <span className="normal-case font-normal text-gray-300">（公開切替できます）</span></label>
                        <input
                            type="text" value={form.realName} onChange={e => set('realName', e.target.value)}
                            placeholder="本名を入力"
                            className="w-full px-4 py-3 bg-amber-50/60 border border-amber-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-300 focus:bg-white transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowRealName(v => !v)}
                            disabled={!form.realName.trim()}
                            className={`w-full mt-2 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                form.realName.trim() && showRealName
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-gray-50 border-gray-100 text-gray-500'
                            }`}
                        >
                            <span className="flex items-center gap-2 text-xs font-bold">
                                {form.realName.trim() && showRealName ? <Eye size={15} /> : <EyeOff size={15} />}
                                ポートフォリオに本名を表示
                            </span>
                            <span className="text-[11px] font-bold">
                                {form.realName.trim() && showRealName ? '表示する' : '表示しない'}
                            </span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <PartialDateInput
                            year={form.birthYear}
                            month={form.birthMonth}
                            day={form.birthDay}
                            approximateAge={form.approximateAge}
                            showApproximateAge={true}
                            onYearChange={v => set('birthYear', v)}
                            onMonthChange={v => set('birthMonth', v)}
                            onDayChange={v => set('birthDay', v)}
                            onApproximateAgeChange={v => set('approximateAge', v)}
                            label="生年月日"
                            labelColor="text-gray-400"
                            showBirthYear={showBirthYear}
                            onShowBirthYearChange={setShowBirthYear}
                            showAge={showAge}
                            onShowAgeChange={setShowAge}
                        />

                        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
                            <label className="text-[11px] font-bold text-gray-500 block">年齢表示の見せ方</label>
                            <div className="mt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAgeDisplayMode('blurred')}
                                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${ageDisplayMode === 'blurred' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'}`}
                                >
                                    かすかに表示
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAgeDisplayMode('formal')}
                                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${ageDisplayMode === 'formal' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'}`}
                                >
                                    正式な年齢で表示
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">※ 公式ページの年齢バッジの見え方を切り替えます。</p>
                        </div>
                        <PartialDateInput
                            year={form.deceasedYear}
                            month={form.deceasedMonth}
                            day={form.deceasedDay}
                            onYearChange={v => set('deceasedYear', v)}
                            onMonthChange={v => set('deceasedMonth', v)}
                            onDayChange={v => set('deceasedDay', v)}
                            label="逝去日"
                            labelColor="text-rose-400"
                            useCheckbox={true}
                            checkboxChecked={deceasedChecked}
                            onCheckboxChange={setDeceasedChecked}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs uppercase tracking-widest font-bold text-gray-400 block">SNS URL</label>
                        <input
                            type="url" value={form.snsUrl} onChange={e => set('snsUrl', e.target.value)}
                            placeholder="https://instagram.com/..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs uppercase tracking-widest font-bold text-gray-400 block">メモ</label>
                        <textarea
                            value={form.notes} onChange={e => set('notes', e.target.value)}
                            placeholder="撮影メモや特徴など..."
                            rows={2}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all resize-none"
                        />
                    </div>

                    <div className="flex gap-2 pt-1">
                        {!isNew && (
                            <button type="button" onClick={handleDelete}
                                className="px-4 py-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl text-sm font-bold transition-all">
                                削除
                            </button>
                        )}
                        <button type="button" onClick={onClose}
                            className="flex-1 py-3 text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-2xl text-sm font-bold transition-all">
                            キャンセル
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl text-sm font-bold disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 active:scale-95">
                            {saving ? '保存中...' : '保存'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}



// ===== メインページ =====
export default function SubjectsPage() {
    const { user } = useAuth();

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [userModels, setUserModels] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingSubject, setEditingSubject] = useState<Subject | null | 'new'>(null);

    const fetchSubjects = async () => {
        const result = await getSubjects();
        if (result.success) setSubjects(result.data);
    };

    const fetchUsers = async () => {
        const result = await getUsers();
        if (result.success && result.users) setUserModels(result.users);
    };

    useEffect(() => {
        let ignore = false;

        Promise.all([getSubjects(), getUsers()])
            .then(([subjectsResult, usersResult]) => {
                if (ignore) return;
                if (subjectsResult.success) setSubjects(subjectsResult.data);
                if (usersResult.success && usersResult.users) setUserModels(usersResult.users);
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, []);

    if (!user) return null;

    return (
        <div className="max-w-5xl mx-auto py-10 px-4 md:px-6 space-y-10">

            <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">モデル管理</h1>
                    <p className="text-sm text-gray-400 mt-1">被写体情報とアカウント連携モデルをまとめて管理します</p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:min-w-72">
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                        <div className="text-2xl font-black text-gray-900">{subjects.length}</div>
                        <div className="text-xs font-bold text-gray-400 mt-1">手入力モデル</div>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                        <div className="text-2xl font-black text-gray-900">{userModels.length}</div>
                        <div className="text-xs font-bold text-gray-400 mt-1">アカウント連携</div>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-7 h-7 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Star size={15} className="text-rose-400" />
                                <span className="text-sm font-bold text-gray-700">被写体 ({subjects.length})</span>
                            </div>
                            <button
                                onClick={() => setEditingSubject('new')}
                                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all active:scale-95"
                            >
                                <Plus size={14} />
                                新規登録
                            </button>
                        </div>

                        {subjects.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                <p className="text-gray-400 text-sm">まだ登録がありません</p>
                                <button onClick={() => setEditingSubject('new')}
                                    className="mt-3 text-indigo-500 font-bold text-sm hover:underline">
                                    最初の被写体を登録する
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
                                {subjects.map(s => {
                                    const age = s.birthday ? calculateAge(s.birthday, s.deceasedDate) : null;

                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => setEditingSubject(s)}
                                            className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-indigo-50/40 active:bg-indigo-50 transition-colors group ${s.deceasedDate ? 'bg-rose-50/20' : ''}`}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${s.deceasedDate ? 'bg-rose-100 text-rose-400' : 'bg-indigo-100 text-indigo-500'}`}>
                                                {s.deceasedDate
                                                    ? <Heart size={16} fill="currentColor" />
                                                    : s.name.charAt(0)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-gray-900 text-sm">{s.name}</div>
                                                <div className="text-xs text-gray-400 mt-0.5 space-x-2">
                                                    {s.realName && (
                                                        <span className={s.showRealName ? 'text-emerald-600' : 'text-amber-600'}>
                                                            {s.realName}{s.showRealName ? '（公開）' : ''}
                                                        </span>
                                                    )}
                                                    {s.birthday && !s.deceasedDate && (
                                                        <span>
                                                            {formatDate(s.birthday)} 生
                                                            {age !== null && `（${age}歳）`}
                                                        </span>
                                                    )}
                                                    {s.birthday && s.deceasedDate && (
                                                        <span className="text-rose-500">
                                                            {formatDate(s.birthday)} - {formatDate(s.deceasedDate)}
                                                            {age !== null && `（享年 ${age}歳）`}
                                                        </span>
                                                    )}
                                                    {!s.birthday && s.approximateAge && !s.deceasedDate && (
                                                        <span>大体の年齢: {s.approximateAge}歳</span>
                                                    )}
                                                    {!s.realName && !s.birthday && !s.deceasedDate && !s.approximateAge && s.snsUrl && (
                                                        <span className="text-blue-400 truncate">{s.snsUrl.replace(/^https?:\/\//, '')}</span>
                                                    )}
                                                    {!s.realName && !s.birthday && !s.deceasedDate && !s.approximateAge && !s.snsUrl && (
                                                        <span className="italic">情報未登録</span>
                                                    )}
                                                </div>
                                            </div>

                                            <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Users size={15} className="text-indigo-400" />
                                <span className="text-sm font-bold text-gray-700">アカウント連携モデル ({userModels.length})</span>
                            </div>
                            <a
                                href="/admin/invite"
                                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all active:scale-95"
                            >
                                <Plus size={14} />
                                招待コード発行
                            </a>
                        </div>

                        {userModels.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                <p className="text-gray-400 text-sm">登録ユーザーがいません</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
                                {userModels.map(model => {
                                    const age = model.birthday ? calculateAge(model.birthday, model.deceasedDate) : null;
                                    const initial = (model.displayName || model.email || '?').charAt(0).toUpperCase();

                                    return (
                                        <div
                                            key={model.uid}
                                            className={`flex flex-col lg:flex-row lg:items-center gap-4 px-5 py-4 ${model.deceasedDate ? 'bg-rose-50/20' : ''}`}
                                        >
                                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0 overflow-hidden ${model.deceasedDate ? 'bg-rose-100 text-rose-400' : 'bg-indigo-100 text-indigo-500'}`}>
                                                    {model.photoURL ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={model.photoURL} alt={model.displayName} className="w-full h-full object-cover" />
                                                    ) : model.deceasedDate ? (
                                                        <Heart size={16} fill="currentColor" />
                                                    ) : (
                                                        initial
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                        <div className="font-bold text-gray-900 text-sm">{model.displayName}</div>
                                                        {model.modelId && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-mono font-bold text-gray-500">
                                                                <Hash size={10} />
                                                                {model.modelId}
                                                            </span>
                                                        )}
                                                        {model.photoCount > 0 && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                                                <Images size={10} />
                                                                {model.photoCount}枚
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                                        <span className="inline-flex items-center gap-1">
                                                            <Mail size={11} />
                                                            {model.email || '-'}
                                                        </span>
                                                        {model.realName && (
                                                            <span className={model.showRealName ? 'text-emerald-600' : 'text-amber-600'}>
                                                                {model.realName}{model.showRealName ? '（公開）' : ''}
                                                            </span>
                                                        )}
                                                        {model.birthday && !model.deceasedDate && (
                                                            <span>
                                                                {formatDate(model.birthday)} 生
                                                                {age !== null && `（${age}歳）`}
                                                            </span>
                                                        )}
                                                        {model.birthday && model.deceasedDate && (
                                                            <span className="text-rose-500">
                                                                {formatDate(model.birthday)} - {formatDate(model.deceasedDate)}
                                                                {age !== null && `（享年 ${age}歳）`}
                                                            </span>
                                                        )}
                                                        {!model.realName && !model.birthday && !model.deceasedDate && (
                                                            <span className="italic">プロフィール詳細未登録</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                                <EditUserModel user={model} onSaved={fetchUsers} />
                                                <ResetPasswordForm userId={model.uid} userEmail={model.email || ''} />
                                                <DeleteUserButton userId={model.uid} userEmail={model.email || ''} onDeleted={fetchUsers} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </>
            )}

            {editingSubject !== null && (
                <SubjectEditModal
                    subject={editingSubject === 'new' ? {} : editingSubject}
                    isNew={editingSubject === 'new'}
                    onClose={() => setEditingSubject(null)}
                    onSaved={fetchSubjects}
                    onDeleted={fetchSubjects}
                />
            )}
        </div>
    );
}
