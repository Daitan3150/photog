'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ja } from '@/locales/ja';
import { en } from '@/locales/en';

type Language = 'ja' | 'en';
type Translations = typeof ja;

interface LanguageContextType {
    language: Language;
    t: Translations;
    setLanguage: (lang: Language) => void;
    toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>('ja');
    const [t, setT] = useState<Translations>(ja);

    // Load saved language from localStorage on mount
    useEffect(() => {
        const savedLang = localStorage.getItem('app-language') as Language;
        if (savedLang && (savedLang === 'ja' || savedLang === 'en')) {
            setLanguageState(savedLang);
            setT(savedLang === 'ja' ? ja : en);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        setT(lang === 'ja' ? ja : en);
        localStorage.setItem('app-language', lang);
    };

    const toggleLanguage = () => {
        setLanguage(language === 'ja' ? 'en' : 'ja');
    };

    return (
        <LanguageContext.Provider value={{ language, t, setLanguage, toggleLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
