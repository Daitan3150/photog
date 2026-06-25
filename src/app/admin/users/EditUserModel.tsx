'use client';

import { useState } from 'react';
import { adminUpdateUserProfile } from '@/lib/actions/users';
import { useRouter } from 'next/navigation';
import { Edit2, X } from 'lucide-react';
import PartialDateInput from '@/components/admin/PartialDateInput';

interface EditUserModelProps {
    user: {
        uid: string;
        displayName: string;
        realName?: string;
        birthday?: string;
        birthYear?: string;
        birthMonth?: string;
        birthDay?: string;
        approximateAge?: string;
        showBirthYear?: boolean;
        deceasedDate?: string;
        deceasedYear?: string;
        deceasedMonth?: string;
        deceasedDay?: string;
        email: string;
    };
}

export default function EditUserModel({ user }: EditUserModelProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [displayName, setDisplayName] = useState(user.displayName);
    const [realName, setRealName] = useState(user.realName || '');
    const [birthYear, setBirthYear] = useState(user.birthYear || (user.birthday ? user.birthday.split('-')[0] : ''));
    const [birthMonth, setBirthMonth] = useState(user.birthMonth || (user.birthday ? user.birthday.split('-')[1] : ''));
    const [birthDay, setBirthDay] = useState(user.birthDay || (user.birthday ? user.birthday.split('-')[2] : ''));
    const [approximateAge, setApproximateAge] = useState(user.approximateAge || '');
    const [showBirthYear, setShowBirthYear] = useState<boolean>(user.showBirthYear === true);
    const [showAge, setShowAge] = useState<boolean>(user.showAge !== false);
    const [deceasedYear, setDeceasedYear] = useState(user.deceasedYear || (user.deceasedDate ? user.deceasedDate.split('-')[0] : ''));
    const [deceasedMonth, setDeceasedMonth] = useState(user.deceasedMonth || (user.deceasedDate ? user.deceasedDate.split('-')[1] : ''));
    const [deceasedDay, setDeceasedDay] = useState(user.deceasedDay || (user.deceasedDate ? user.deceasedDate.split('-')[2] : ''));
    const [deceasedChecked, setDeceasedChecked] = useState(!!(user.deceasedDate || user.deceasedYear || user.deceasedMonth));
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const birthdayStr = birthYear && birthMonth && birthDay ? `${birthYear}-${birthMonth}-${birthDay}` : '';
            const deceasedDateStr = deceasedChecked && deceasedYear && deceasedMonth && deceasedDay ? `${deceasedYear}-${deceasedMonth}-${deceasedDay}` : '';

            const result = await adminUpdateUserProfile(user.uid, {
                displayName,
                realName: realName.trim() || '',
                birthday: birthdayStr,
                birthYear,
                birthMonth,
                birthDay,
                approximateAge,
                showBirthYear,
                showAge,
                deceasedDate: deceasedDateStr,
                deceasedYear: deceasedChecked ? deceasedYear : '',
                deceasedMonth: deceasedChecked ? deceasedMonth : '',
                deceasedDay: deceasedChecked ? deceasedDay : '',
            });

            if (result.success) {
                setMessage('プロフィールを正常に更新しました。');
                router.refresh();
                setTimeout(() => {
                    setIsOpen(false);
                    setMessage('');
                }, 1000);
            } else {
                setError(result.error || 'プロフィールの更新に失敗しました。');
            }
        } catch (err: any) {
            setError(err.message || '予期せぬエラーが発生しました。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors font-medium"
            >
                <Edit2 size={12} />
                <span>編集</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden relative border border-gray-100 flex flex-col text-left">
                        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800 text-lg">プロフィール編集</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">メールアドレス: {user.email}</p>
                                <p className="text-xs text-gray-400 font-mono">UID: {user.uid}</p>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-gray-700">表示名 (活動名)</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="表示名を入力"
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-gray-700">本名</label>
                                <input
                                    type="text"
                                    value={realName}
                                    onChange={(e) => setRealName(e.target.value)}
                                    placeholder="本名を入力"
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <PartialDateInput
                                    year={birthYear}
                                    month={birthMonth}
                                    day={birthDay}
                                    approximateAge={approximateAge}
                                    showApproximateAge={true}
                                    onYearChange={setBirthYear}
                                    onMonthChange={setBirthMonth}
                                    onDayChange={setBirthDay}
                                    onApproximateAgeChange={setApproximateAge}
                                    label="生年月日"
                                    labelColor="text-gray-700"
                                    showBirthYear={showBirthYear}
                                    onShowBirthYearChange={setShowBirthYear}
                                    showAge={showAge}
                                    onShowAgeChange={setShowAge}
                                />

                                <PartialDateInput
                                    year={deceasedYear}
                                    month={deceasedMonth}
                                    day={deceasedDay}
                                    onYearChange={setDeceasedYear}
                                    onMonthChange={setDeceasedMonth}
                                    onDayChange={setDeceasedDay}
                                    label="逝去日"
                                    labelColor="text-red-600"
                                    useCheckbox={true}
                                    checkboxChecked={deceasedChecked}
                                    onCheckboxChange={setDeceasedChecked}
                                />
                            </div>
                            <p className="text-xs text-gray-400 leading-normal">
                                ※ 忘れないように生年月日、没年月日、本名を記録できます。
                            </p>

                            {message && <p className="text-green-600 font-bold text-xs bg-green-50 p-2.5 rounded-lg">{message}</p>}
                            {error && <p className="text-red-600 font-bold text-xs bg-red-50 p-2.5 rounded-lg">{error}</p>}

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-500 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2 rounded-lg text-xs font-bold disabled:opacity-50 transition-all shadow-md shadow-indigo-100"
                                >
                                    {loading ? '保存中...' : '変更を保存する'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
