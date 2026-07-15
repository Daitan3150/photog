"use client";

import Image from "next/image";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { motion } from "framer-motion";
import { normalizeGearEntry, type GearItem, type Profile } from "@/lib/firebase/profile";

function GearEntryRow({ item, className }: { item: string | GearItem; className: string }) {
    const entry = normalizeGearEntry(item);
    const manufacturer = entry.manufacturer?.trim();
    const modelName = entry.modelName?.trim();

    const getAutoFontSize = (text: string | undefined): string => {
        if (!text) return '';
        const len = text.length;
        if (len > 60) return 'text-[8px]';
        if (len > 40) return 'text-[9px]';
        if (len > 25) return 'text-[10px]';
        return 'text-[11px]';
    };

    if (!manufacturer && !modelName) {
        return null;
    }

    if (!manufacturer) {
        return <p className={`${className} whitespace-nowrap overflow-hidden text-ellipsis`}>{modelName}</p>;
    }

    return (
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1.5 overflow-visible">
            <div className="w-fit shrink-0 rounded-[2px] bg-gray-100 px-1 py-[1px] text-[5.5px] font-medium uppercase tracking-[0.12em] text-gray-600 whitespace-nowrap overflow-visible">
                {manufacturer}
            </div>
            <p className={`${className} ${getAutoFontSize(modelName)} whitespace-nowrap overflow-visible`}>{modelName}</p>
        </div>
    );
}

function GearCategoryCard({ title, items }: { title: string; items: Array<string | GearItem> }) {
    if (!items.length) return null;

    const getCardStyle = (value: string) => {
        switch (value) {
            case 'AFレンズ':
                return 'border-blue-200 bg-blue-50/70';
            case 'Old Lenses（オールドレンズ / MF）':
                return 'border-amber-200 bg-amber-50/70';
            case 'Manual Lenses（現行MF）':
                return 'border-emerald-200 bg-emerald-50/70';
            case 'Adapters｜アダプター':
                return 'border-violet-200 bg-violet-50/70';
            case 'AFアダプター':
                return 'border-indigo-200 bg-indigo-50/70';
            case 'MFアダプター':
                return 'border-rose-200 bg-rose-50/70';
            default:
                return 'border-gray-200 bg-white';
        }
    };

    const getTitleColor = (value: string) => {
        switch (value) {
            case 'AFレンズ':
                return 'text-blue-700 bg-blue-100/80';
            case 'Old Lenses（オールドレンズ / MF）':
                return 'text-amber-700 bg-amber-100/80';
            case 'Manual Lenses（現行MF）':
                return 'text-emerald-700 bg-emerald-100/80';
            case 'Adapters｜アダプター':
                return 'text-violet-700 bg-violet-100/80';
            case 'AFアダプター':
                return 'text-indigo-700 bg-indigo-100/80';
            case 'MFアダプター':
                return 'text-rose-700 bg-rose-100/80';
            default:
                return 'text-gray-600 bg-gray-100/80';
        }
    };

    return (
        <div className={`space-y-3 rounded-xl border p-4 shadow-sm ${getCardStyle(title)}`}>
            <div className={`inline-flex rounded-full px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.24em] ${getTitleColor(title)}`}>
                {title}
            </div>
            <div className="space-y-3">
                {items.map((item, index) => (
                    <GearEntryRow key={`${title}-${index}`} item={item} className="text-[11px] font-medium leading-tight text-gray-700 sm:text-sm" />
                ))}
            </div>
        </div>
    );
}

function GearSection({ profile }: { profile: Profile | null }) {
    if (!profile) return null;
    const hasGear = (profile.mainGear?.length ?? 0) > 0 || (profile.subGear?.length ?? 0) > 0 || (profile.lenses?.length ?? 0) > 0 || (profile.gear?.length ?? 0) > 0;
    if (!hasGear) return null;

    const lensItems = (profile.lenses?.filter(Boolean) ?? []) as Array<string | GearItem>;
    const otherItems = (profile.otherGear?.filter(Boolean) ?? []) as Array<string | GearItem>;
    const mainItems = (profile.mainGear?.filter(Boolean) ?? []) as Array<string | GearItem>;
    const subItems = (profile.subGear?.filter(Boolean) ?? []) as Array<string | GearItem>;
    const lensCategories = [
        { key: 'AFレンズ', label: 'AFレンズ' },
        { key: 'Old Lenses（オールドレンズ / MF）', label: 'Old Lenses（オールドレンズ / MF）' },
        { key: 'Manual Lenses（現行MF）', label: 'Manual Lenses（現行MF）' },
    ];
    const adapterCategories = [
        { key: 'Adapters｜アダプター', label: 'Adapters｜アダプター' },
        { key: 'AFアダプター', label: 'AFアダプター' },
        { key: 'MFアダプター', label: 'MFアダプター' },
    ];

    const getEntriesForCategory = (items: Array<string | GearItem>, categoryKey: string) =>
        items
            .map((item) => normalizeGearEntry(item))
            .filter((entry) => (entry.category || '').trim() === categoryKey);

    return (
        <section className="relative z-10 border-t border-gray-100 bg-white pt-4 sm:pt-6 md:pt-8">
            <motion.h2
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="mb-3 text-[7px] font-bold uppercase tracking-[0.38em] text-gray-400 sm:mb-4 sm:text-[8px] md:mb-5"
            >
                Equipments
            </motion.h2>
            <div className="flex flex-col gap-4 sm:gap-6 md:gap-7">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-7">
                    <div className="space-y-5">
                        {(profile.mainGear?.length ?? 0) > 0 && (
                            <div className="space-y-3 rounded-lg border border-gray-300 p-4">
                                <h3 className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">
                                    <span className="h-1.25 w-1.25 rounded-full bg-slate-600" /> Main Gear
                                </h3>
                                <div className="space-y-3 border-l border-gray-100 pl-3">
                                    {mainItems.map((item, i: number) => (
                                        <GearEntryRow key={i} item={item} className="text-xs font-medium leading-tight text-gray-600 transition-colors hover:text-black sm:text-sm" />
                                    ))}
                                </div>
                            </div>
                        )}
                        {(profile.subGear?.length ?? 0) > 0 && (
                            <div className="space-y-3 rounded-lg border border-gray-300 p-4">
                                <h3 className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-gray-500">
                                    <span className="h-1.25 w-1.25 rounded-full bg-gray-500" /> Sub Gear
                                </h3>
                                <div className="space-y-3 border-l border-gray-100 pl-3">
                                    {subItems.map((item, i: number) => (
                                        <GearEntryRow key={i} item={item} className="text-xs font-medium leading-tight text-gray-400 italic transition-colors hover:text-gray-600 sm:text-sm" />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="space-y-5">
                        {(lensItems.length ?? 0) > 0 && (
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-gray-900">
                                    <span className="h-1.25 w-1.25 scale-125 rounded-full bg-gray-900" /> Lenses
                                </h3>
                                <div className="space-y-3">
                                    {lensCategories.map((category) => {
                                        const entries = getEntriesForCategory(lensItems, category.key);
                                        return entries.length > 0 ? (
                                            <GearCategoryCard key={category.key} title={category.label} items={entries} />
                                        ) : null;
                                    })}
                                    {lensItems.some((item) => !(normalizeGearEntry(item).category || '').trim()) && (
                                        <GearCategoryCard title="Other Lenses" items={lensItems.filter((item) => !(normalizeGearEntry(item).category || '').trim())} />
                                    )}
                                </div>
                            </div>
                        )}
                        {(otherItems.length ?? 0) > 0 && (
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-gray-600">
                                    <span className="h-1.25 w-1.25 rounded-full bg-gray-400" /> Other
                                </h3>
                                <div className="space-y-3">
                                    {adapterCategories.map((category) => {
                                        const entries = getEntriesForCategory(otherItems, category.key);
                                        return entries.length > 0 ? (
                                            <GearCategoryCard key={category.key} title={category.label} items={entries} />
                                        ) : null;
                                    })}
                                    {otherItems.some((item) => !(normalizeGearEntry(item).category || '').trim()) && (
                                        <GearCategoryCard title="Other Accessories" items={otherItems.filter((item) => !(normalizeGearEntry(item).category || '').trim())} />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {((profile.mainGear?.length ?? 0) === 0 && (profile.subGear?.length ?? 0) === 0 && (profile.lenses?.length ?? 0) === 0 && (profile.gear?.length ?? 0) > 0) && (
                    <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
                        {profile.gear?.filter(Boolean).map((item: string, index: number) => (
                            <div key={index} className="group flex flex-col gap-2">
                                <div className="border-l-2 border-gray-200 py-0.5 pl-4 text-sm font-medium tracking-wide text-gray-800 transition-colors duration-300 group-hover:border-black md:text-base">
                                    {item.replace(/^[•\-*|｜\s—]+/, '').trim()}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

export default function AboutContent({ profile }: { profile: Profile | null }) {
    const { language, t } = useLanguage();

    // Bilingual Data handling
    const isJa = language === 'ja';
    const name = profile?.name || "DAITAN";
    const role = isJa ? (profile?.roleJa || profile?.role || "フォトグラファー") : (profile?.roleEn || "Photographer");
    const location = isJa ? (profile?.locationJa || profile?.location || "北海道 札幌市") : (profile?.locationEn || "Hokkaido, Sapporo");
    const bio = isJa ? (profile?.bioJa || profile?.bio || "") : (profile?.bioEn || "");
    const conceptText = isJa ? (profile?.conceptJa || t.about.conceptText) : (profile?.conceptEn || t.about.conceptText);
    const visionText = isJa ? (profile?.visionJa || t.about.visionText) : (profile?.visionEn || t.about.visionText);
    const imageUrl = profile?.imageUrl || "/images/portrait.png";

    return (
        <main className="min-h-screen bg-white px-1.5 pb-6 pt-6 selection:bg-black selection:text-white sm:px-3 sm:pb-12 sm:pt-12 lg:px-4">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 sm:gap-4 lg:flex-row lg:items-start lg:gap-3">
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="pointer-events-none absolute inset-0 z-0 opacity-20 lg:static lg:w-0 lg:opacity-0"
                >
                    <div className="relative mx-auto aspect-[3/4] h-full min-h-[260px] w-full max-w-[280px] overflow-hidden rounded-xl bg-gray-50/70 sm:max-w-[320px] sm:rounded-2xl lg:h-[calc(100vh-8rem)] lg:min-h-[420px] lg:max-w-none">
                        <Image
                            src={imageUrl}
                            alt={name}
                            fill
                            className="h-full w-full object-cover opacity-30 transition-transform duration-1000 hover:scale-105"
                            priority
                        />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="relative z-10 flex w-full flex-col gap-3 sm:gap-6 md:gap-8 lg:w-full"
                >
                    <header className="space-y-2 sm:space-y-4 md:space-y-6">
                        <div className="h-12 sm:h-16" />
                        <div className="space-y-3">
                            <h2 className="text-lg font-serif tracking-tight text-gray-900 sm:text-2xl md:text-3xl lg:text-4xl">{name}</h2>
                            <div className="flex flex-col gap-1 sm:gap-2">
                                <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-gray-900 sm:text-[10px] sm:tracking-[0.35em] md:text-xs">
                                    {role}
                                </p>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="h-[1px] w-5 bg-gray-200 sm:w-6" />
                                    <p className="text-[7px] font-medium uppercase tracking-[0.16em] text-gray-400 sm:text-[9px] sm:tracking-[0.2em] md:text-[10px]">
                                        BASED IN {location}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Brand Concept & Vision */}
                    <div className="grid grid-cols-1 gap-2 pt-0 sm:gap-4 md:grid-cols-2 md:gap-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="space-y-4"
                        >
                            <h3 className="text-[7px] font-bold uppercase tracking-[0.28em] text-gray-400">{t.about.conceptTitle}</h3>
                            <p className="whitespace-pre-wrap text-[13px] font-normal leading-7 text-gray-700 md:text-[15px]">
                                {conceptText}
                            </p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="space-y-4"
                        >
                            <h3 className="text-[7px] font-bold uppercase tracking-[0.28em] text-gray-400">{t.about.visionTitle}</h3>
                            <p className="whitespace-pre-wrap text-[13px] font-normal leading-7 text-gray-700 italic md:text-[15px]">
                                {visionText}
                            </p>
                        </motion.div>
                    </div>

                    <section
                        className="relative max-w-2xl pt-1 text-[13px] font-normal leading-relaxed text-gray-800 whitespace-pre-wrap md:text-lg"
                    >
                        <div className="absolute -left-6 top-8 hidden h-12 w-1 bg-gray-100 md:block" />
                        <h3 className="mb-1 text-[6px] font-bold uppercase tracking-[0.24em] text-gray-400 sm:mb-2 sm:text-[8px] sm:tracking-[0.32em]">{t.about.biographyTitle}</h3>
                        <div className="font-light" style={{ lineHeight: 1.8, letterSpacing: '0.02em' }}>
                            {bio || t.about.biographyText}
                        </div>
                    </section>

                    <GearSection profile={profile} />

                    <footer className="pt-2 opacity-20 sm:pt-6">
                        <div className="h-px w-24 bg-gray-900" />
                    </footer>
                </motion.div>
            </div>
        </main>
    );
}
