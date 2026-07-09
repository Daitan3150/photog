"use client";

import Image from "next/image";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { motion } from "framer-motion";
import type { Profile } from "@/lib/firebase/profile";

// Helper for gear section (kept simple)
function GearSection({ profile }: { profile: Profile | null }) {
    if (!profile) return null;
    const hasGear = (profile.mainGear?.length ?? 0) > 0 || (profile.subGear?.length ?? 0) > 0 || (profile.lenses?.length ?? 0) > 0 || (profile.gear?.length ?? 0) > 0;
    if (!hasGear) return null;

    return (
        <section className="border-t border-gray-100 pt-8 sm:pt-10 md:pt-12">
            <motion.h2
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="mb-6 text-[8px] font-bold uppercase tracking-[0.45em] text-gray-400 sm:mb-8 sm:text-[9px] md:mb-10"
            >
                Equipments
            </motion.h2>
            <div className="flex flex-col gap-6 sm:gap-8 md:gap-10">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
                    <div className="space-y-8">
                        {(profile.mainGear?.length ?? 0) > 0 && (
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-900">
                                    <span className="h-1.5 w-1.5 rounded-full bg-black" /> Main Gear
                                </h3>
                                <div className="space-y-3 border-l border-gray-100 pl-4">
                                    {profile.mainGear?.filter(Boolean).map((item: string, i: number) => (
                                        <p key={i} className="text-sm font-medium leading-tight text-gray-600 transition-colors hover:text-black md:text-base">{item}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                        {(profile.subGear?.length ?? 0) > 0 && (
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-gray-200" /> Sub Gear
                                </h3>
                                <div className="space-y-3 border-l border-gray-100 pl-4">
                                    {profile.subGear?.filter(Boolean).map((item: string, i: number) => (
                                        <p key={i} className="text-sm font-medium leading-tight text-gray-400 italic transition-colors hover:text-gray-600 md:text-base">{item}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="space-y-8">
                        {(profile.lenses?.length ?? 0) > 0 && (
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-900">
                                    <span className="h-1.5 w-1.5 scale-125 rounded-full bg-gray-900" /> Lenses
                                </h3>
                                <div className="grid grid-cols-1 gap-3 border-l border-gray-100 pl-4">
                                    {profile.lenses?.filter(Boolean).map((item: string, i: number) => (
                                        <p key={i} className="text-sm font-medium leading-tight text-gray-700 transition-colors hover:text-black md:text-base">{item}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                        {(profile.otherGear?.length ?? 0) > 0 && (
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
                                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> Other
                                </h3>
                                <div className="grid grid-cols-1 gap-3 border-l border-gray-100 pl-4">
                                    {profile.otherGear?.filter(Boolean).map((item: string, i: number) => (
                                        <p key={i} className="text-sm font-medium leading-tight text-gray-600 transition-colors hover:text-black md:text-base">{item}</p>
                                    ))}
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
    const { language } = useLanguage();

    // Bilingual Data handling
    const isJa = language === 'ja';
    const name = profile?.name || "DAITAN";
    const role = isJa ? (profile?.roleJa || profile?.role || "フォトグラファー") : (profile?.roleEn || "Photographer");
    const location = isJa ? (profile?.locationJa || profile?.location || "北海道 札幌市") : (profile?.locationEn || "Hokkaido, Sapporo");
    const bio = isJa ? (profile?.bioJa || profile?.bio || "") : (profile?.bioEn || "");
    const imageUrl = profile?.imageUrl || "/images/portrait.png";

    const { t } = useLanguage();

    return (
        <main className="min-h-screen bg-white px-3 pb-12 pt-16 selection:bg-black selection:text-white sm:px-6 sm:pb-20 sm:pt-24 lg:px-8">
            <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 sm:gap-10 lg:flex-row lg:items-start lg:gap-14">
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="w-full lg:sticky lg:top-28 lg:w-[34%]"
                >
                    <div className="relative mx-auto aspect-[3/4] w-full max-w-[180px] overflow-hidden rounded-xl bg-gray-50 sm:max-w-none sm:rounded-2xl">
                        <Image
                            src={imageUrl}
                            alt={name}
                            fill
                            className="object-cover transition-transform duration-1000 hover:scale-105"
                            priority
                        />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="flex w-full flex-col gap-6 sm:gap-8 md:gap-10 lg:w-[66%]"
                >
                    <header className="space-y-4 sm:space-y-6 md:space-y-8">
                        <div className="space-y-2">
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                className="ml-1 block text-[8px] uppercase tracking-[0.55em] text-gray-400 sm:text-[9px] sm:tracking-[0.7em]"
                            >
                                Profile
                            </motion.span>
                            <motion.h1
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-4xl font-serif leading-none tracking-tighter text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl"
                            >
                                {t.about.title}
                            </motion.h1>
                        </div>

                        <div className="space-y-8">
                            <h2 className="text-2xl font-serif tracking-tight text-gray-900 sm:text-3xl md:text-4xl lg:text-5xl">{name}</h2>
                            <div className="flex flex-col gap-2 sm:gap-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-gray-900 sm:text-xs sm:tracking-[0.45em] md:text-sm">
                                    {role}
                                </p>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="h-[1px] w-5 bg-gray-200 sm:w-6" />
                                    <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-gray-400 sm:text-[10px] sm:tracking-[0.25em] md:text-xs">
                                        BASED IN {location}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Brand Concept & Vision */}
                    <div className="grid grid-cols-1 gap-4 pt-1 sm:gap-6 sm:pt-2 md:grid-cols-2 md:gap-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="space-y-4"
                        >
                            <h3 className="text-[9px] font-bold uppercase tracking-[0.35em] text-gray-400">{t.about.conceptTitle}</h3>
                            <p className="text-sm font-light leading-relaxed text-gray-700 md:text-base">
                                {t.about.conceptText}
                            </p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="space-y-4"
                        >
                            <h3 className="text-[9px] font-bold uppercase tracking-[0.35em] text-gray-400">{t.about.visionTitle}</h3>
                            <p className="text-sm font-light leading-relaxed text-gray-700 italic md:text-base">
                                {t.about.visionText}
                            </p>
                        </motion.div>
                    </div>

                    <section
                        className="relative max-w-2xl pt-4 text-lg font-normal leading-relaxed text-gray-800 whitespace-pre-wrap md:text-xl"
                    >
                        <div className="absolute -left-6 top-8 hidden h-12 w-1 bg-gray-100 md:block" />
                        <h3 className="mb-3 text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400 sm:mb-4 sm:text-[9px] sm:tracking-[0.35em]">{t.about.biographyTitle}</h3>
                        <div className="font-light" style={{ lineHeight: 1.8, letterSpacing: '0.02em' }}>
                            {bio || t.about.biographyText}
                        </div>
                    </section>

                    <GearSection profile={profile} />

                    <footer className="pt-6 opacity-20 sm:pt-10">
                        <div className="h-px w-24 bg-gray-900" />
                    </footer>
                </motion.div>
            </div>
        </main>
    );
}
