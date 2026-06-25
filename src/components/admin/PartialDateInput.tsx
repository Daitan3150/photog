import React, { useMemo } from 'react';

interface PartialDateInputProps {
    year: string;
    month: string;
    day: string;
    approximateAge?: string;
    showApproximateAge?: boolean;
    onYearChange: (val: string) => void;
    onMonthChange: (val: string) => void;
    onDayChange: (val: string) => void;
    onApproximateAgeChange?: (val: string) => void;
    label: string;
    labelColor?: string;
    useCheckbox?: boolean;
    checkboxChecked?: boolean;
    onCheckboxChange?: (checked: boolean) => void;
}

export default function PartialDateInput({
    year, month, day,
    approximateAge = '',
    showApproximateAge = false,
    onYearChange, onMonthChange, onDayChange, onApproximateAgeChange,
    label, labelColor = 'text-gray-400',
    useCheckbox = false, checkboxChecked = false, onCheckboxChange,
}: PartialDateInputProps) {
    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const ys = [];
        for (let i = currentYear; i >= 1900; i--) ys.push(i.toString());
        return ys;
    }, []);

    const months = useMemo(() => {
        const ms = [];
        for (let i = 1; i <= 12; i++) ms.push(i.toString().padStart(2, '0'));
        return ms;
    }, []);

    const days = useMemo(() => {
        if (!month) return [];
        let daysInMonth = 31;
        const m = parseInt(month, 10);
        if (m === 2) {
            if (year) {
                const y = parseInt(year, 10);
                daysInMonth = (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28;
            } else {
                daysInMonth = 29;
            }
        } else if ([4, 6, 9, 11].includes(m)) {
            daysInMonth = 30;
        }
        const ds = [];
        for (let i = 1; i <= daysInMonth; i++) ds.push(i.toString().padStart(2, '0'));
        return ds;
    }, [year, month]);

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMonth = e.target.value;
        onMonthChange(newMonth);
        if (newMonth && day) {
            let daysInMonth = 31;
            const m = parseInt(newMonth, 10);
            if (m === 2) {
                if (year) {
                    const y = parseInt(year, 10);
                    daysInMonth = (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28;
                } else {
                    daysInMonth = 29;
                }
            } else if ([4, 6, 9, 11].includes(m)) {
                daysInMonth = 30;
            }
            if (parseInt(day, 10) > daysInMonth) onDayChange('');
        }
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        if (!checked) {
            onYearChange('');
            onMonthChange('');
            onDayChange('');
        }
        onCheckboxChange?.(checked);
    };

    const isDisabled = useCheckbox && !checkboxChecked;

    return (
        <div className="space-y-1.5">
            <label className={`text-xs uppercase tracking-widest font-bold flex items-center gap-2 ${labelColor}`}>
                {useCheckbox && (
                    <input
                        type="checkbox"
                        checked={checkboxChecked}
                        onChange={handleCheckboxChange}
                        className="w-4 h-4 rounded border-gray-300 accent-rose-500 cursor-pointer"
                    />
                )}
                {label}
            </label>

            {!isDisabled && (
                <>
                    <div className="flex gap-2 items-center">
                        <select
                            value={year}
                            onChange={e => onYearChange(e.target.value)}
                            className="flex-1 px-3 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all appearance-none text-center"
                        >
                            <option value="">年(不明)</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select
                            value={month}
                            onChange={handleMonthChange}
                            className="flex-1 px-3 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all appearance-none text-center"
                        >
                            <option value="">月</option>
                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select
                            value={day}
                            onChange={e => onDayChange(e.target.value)}
                            disabled={!month}
                            className="flex-1 px-3 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all appearance-none text-center disabled:opacity-50"
                        >
                            <option value="">日</option>
                            {days.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    {showApproximateAge && !year && onApproximateAgeChange && (
                        <div className="pt-2">
                            <label className={`text-xs block mb-1 ${labelColor}`}>大体の年齢（年が不明な場合）</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={approximateAge}
                                    onChange={e => onApproximateAgeChange(e.target.value)}
                                    placeholder="例: 20"
                                    className="w-24 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
                                />
                                <span className="text-sm text-gray-500 font-bold">歳</span>
                            </div>
                        </div>
                    )}
                </>
            )}

            {isDisabled && (
                <p className="text-xs text-gray-300 italic pl-1">チェックを入れると入力できます</p>
            )}
        </div>
    );
}
