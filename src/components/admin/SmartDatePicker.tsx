'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Edit3 } from 'lucide-react';
import { format, parse, isValid, getYear, getMonth, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';

interface SmartDatePickerProps {
    value: string; // YYYY-MM-DD
    onChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
}

const YEARS = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i);

export default function SmartDatePicker({ value, onChange, disabled, className }: SmartDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'year' | 'month' | 'day'>('year');
    const [selectedDate, setSelectedDate] = useState<Date>(
        value && isValid(new Date(value)) ? new Date(value) : new Date()
    );
    const [inputValue, setInputValue] = useState(value || '');
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync input value with external value
    useEffect(() => {
        setInputValue(value || '');
        if (value && isValid(new Date(value))) {
            setSelectedDate(new Date(value));
        }
    }, [value]);

    // Handle manual text input
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);

        // Simple validation for YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const date = new Date(val);
            if (isValid(date)) {
                onChange(val);
                setSelectedDate(date);
            }
        }
    };

    const togglePicker = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
        if (!isOpen) setView('year'); // Start with year selection as requested
    };

    const handleYearSelect = (year: number) => {
        const newDate = new Date(selectedDate);
        newDate.setFullYear(year);
        setSelectedDate(newDate);
        setView('month');
    };

    const handleMonthSelect = (month: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(month);
        setSelectedDate(newDate);
        setView('day');
    };

    const handleDaySelect = (day: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(day);
        const formatted = format(newDate, 'yyyy-MM-dd');
        onChange(formatted);
        setIsOpen(false);
    };

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentYear = getYear(selectedDate);
    const currentMonth = getMonth(selectedDate);
    const daysInMonth = getDaysInMonth(selectedDate);
    const firstDayOfMonth = getDay(startOfMonth(selectedDate));

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="flex gap-1">
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="YYYY-MM-DD"
                    disabled={disabled}
                    className="flex-1 border p-2 rounded-l outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 text-sm"
                />
                <button
                    type="button"
                    onClick={togglePicker}
                    disabled={disabled}
                    className="px-3 bg-gray-100 border border-l-0 rounded-r hover:bg-gray-200 transition-colors disabled:opacity-50"
                    title="カレンダーから選択"
                >
                    <CalendarIcon className="w-4 h-4 text-gray-600" />
                </button>
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in duration-200 origin-top-right right-0">
                    <div className="flex items-center justify-between mb-4 border-b pb-2">
                        <h3 className="text-sm font-bold text-gray-700">
                            {view === 'year' && '年を選択'}
                            {view === 'month' && `${currentYear}年 - 月を選択`}
                            {view === 'day' && `${currentYear}年 ${currentMonth + 1}月`}
                        </h3>
                        {view !== 'year' && (
                            <button
                                onClick={() => setView(view === 'day' ? 'month' : 'year')}
                                className="text-[10px] text-blue-500 hover:underline font-bold"
                            >
                                戻る
                            </button>
                        )}
                    </div>

                    {view === 'year' && (
                        <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-48 p-1">
                            {Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - 30 + i).map(year => (
                                <button
                                    key={year}
                                    onClick={() => handleYearSelect(year)}
                                    className={`p-2 text-xs rounded hover:bg-blue-50 hover:text-blue-600 transition-colors ${year === currentYear ? 'bg-blue-600 text-white font-bold' : 'bg-gray-50 text-gray-600'}`}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                    )}

                    {view === 'month' && (
                        <div className="grid grid-cols-3 gap-2 p-1">
                            {MONTHS.map(m => (
                                <button
                                    key={m}
                                    onClick={() => handleMonthSelect(m)}
                                    className={`p-2 text-xs rounded hover:bg-blue-50 hover:text-blue-600 transition-colors ${m === currentMonth ? 'bg-blue-600 text-white font-bold' : 'bg-gray-50 text-gray-600'}`}
                                >
                                    {m + 1}月
                                </button>
                            ))}
                        </div>
                    )}

                    {view === 'day' && (
                        <div>
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['日', '月', '火', '水', '木', '金', '土'].map(d => (
                                    <div key={d} className="text-[10px] text-center font-bold text-gray-400 py-1">{d}</div>
                                ))}
                                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                    <div key={`empty-${i}`} />
                                ))}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const isSelected = selectedDate.getDate() === day;
                                    return (
                                        <button
                                            key={day}
                                            onClick={() => handleDaySelect(day)}
                                            className={`p-1.5 text-xs rounded transition-colors ${isSelected ? 'bg-blue-600 text-white font-bold' : 'hover:bg-blue-50 text-gray-600'}`}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
