'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function ContactPage() {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen pt-32 px-6 pb-20 max-w-2xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-serif mb-8 tracking-widest uppercase">{t.contact.title}</h1>

            <p className="mb-12 leading-relaxed text-gray-600">
                {t.contact.intro}
            </p>

            <div className="space-y-8">
                <div>
                    <h2 className="text-sm font-bold tracking-widest uppercase mb-6">{t.contact.snsLabel}</h2>
                    <div className="flex flex-col md:flex-row justify-center gap-6">
                        <a
                            href="https://instagram.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-black text-white px-8 py-4 rounded-full text-lg hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                            <span>{t.contact.followInstagram}</span>
                        </a>
                        <a
                            href="https://twitter.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-black text-white px-8 py-4 rounded-full text-lg hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                            <span>{t.contact.followX}</span>
                        </a>
                    </div>
                </div>

                <div className="mt-12 pt-12 border-t border-gray-100">
                    <p className="text-sm text-gray-400">
                        {t.contact.note}
                    </p>
                </div>
            </div>
        </div>
    );
}
