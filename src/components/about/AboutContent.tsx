"use client";

import Image from "next/image";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { motion } from "framer-motion";

// Helper for gear section (kept simple)
function GearSection({ profile }: { profile: any }) {
    if (!profile) return null;
    const hasGear = profile?.mainGear?.length > 0 || profile?.subGear?.length > 0 || profile?.lenses?.length > 0 || profile?.gear?.length > 0;
    if (!hasGear) return null;

    return (
        <section className="pt-20 border-t border-gray-100">
            <motion.h2
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="text-[10px] font-bold tracking-[0.6em] mb-12 uppercase text-gray-400"
            >
                Equipments
            </motion.h2>
            <div className="flex flex-col gap-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
                    <div className="space-y-10">
                        {profile?.mainGear?.length > 0 && (
                            <div className="space-y-6">
                                <h3 className="text-xs font-bold tracking-[0.2em] text-gray-900 uppercase flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 bg-black rounded-full" /> Main Gear
                                </h3>
                                <div className="space-y-4 pl-4 border-l border-gray-100">
                                    {profile.mainGear.filter(Boolean).map((item: string, i: number) => (
                                        <p key={i} className="text-gray-600 text-sm md:text-base leading-tight font-medium hover:text-black transition-colors">{item}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                        {profile?.subGear?.length > 0 && (
                            <div className="space-y-6">
                                <h3 className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 bg-gray-200 rounded-full" /> Sub Gear
                                </h3>
                                <div className="space-y-4 pl-4 border-l border-gray-100">
                                    {profile.subGear.filter(Boolean).map((item: string, i: number) => (
                                        <p key={i} className="text-gray-400 text-sm md:text-base leading-tight font-medium hover:text-gray-600 transition-colors italic">{item}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="space-y-10">
                        {profile?.lenses?.length > 0 && (
                            <div className="space-y-6">
                                <h3 className="text-xs font-bold tracking-[0.2em] text-gray-900 uppercase flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 bg-gray-900 rounded-full scale-125" /> Lenses
                                </h3>
                                <div className="grid grid-cols-1 gap-4 pl-4 border-l border-gray-100">
                                    {profile.lenses.filter(Boolean).map((item: string, i: number) => (
                                        <p key={i} className="text-gray-700 text-sm md:text-base leading-tight font-medium hover:text-black transition-colors">{item}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                        {profile?.otherGear?.length > 0 && (
                            <div className="space-y-6">
                                <h3 className="text-xs font-bold tracking-[0.2em] text-gray-600 uppercase flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" /> Other
                                </h3>
                                <div className="grid grid-cols-1 gap-4 pl-4 border-l border-gray-100">
                                    {profile.otherGear.filter(Boolean).map((item: string, i: number) => (
                                        <p key={i} className="text-gray-600 text-sm md:text-base leading-tight font-medium hover:text-black transition-colors">{item}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {(!profile?.mainGear?.length && !profile?.subGear?.length && !profile?.lenses?.length && profile?.gear?.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6">
                        {profile.gear.filter(Boolean).map((item: string, index: number) => (
                            <div key={index} className="group flex flex-col gap-2">
                                <div className="text-gray-800 text-sm md:text-base font-medium tracking-wide pl-4 border-l-2 border-gray-200 group-hover:border-black transition-colors duration-300 py-0.5">
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

export default function AboutContent({ profile }: { profile: any }) {
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
        <main className="min-h-screen pt-32 px-6 pb-24 bg-white selection:bg-black selection:text-white">
            <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-20 lg:gap-24 items-center lg:items-start">
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="w-full lg:w-[40%] lg:sticky lg:top-40"
                >
                    <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-gray-50">
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
                    className="w-full lg:w-[60%] flex flex-col gap-14"
                >
                    <header className="space-y-10">
                        <div className="space-y-2">
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-[10px] tracking-[0.8em] text-gray-400 uppercase block ml-1"
                            >
                                Profile
                            </motion.span>
                            <motion.h1
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-7xl md:text-9xl font-serif tracking-tighter text-gray-900 leading-none"
                            >
                                {t.about.title}
                            </motion.h1>
                        </div>

                        <div className="space-y-8">
                            <h2 className="text-5xl md:text-7xl font-serif text-gray-900 tracking-tight">{name}</h2>
                            <div className="flex flex-col gap-4">
                                <p className="text-gray-900 font-bold tracking-[0.5em] text-xs md:text-sm uppercase">
                                    {role}
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-[1px] bg-gray-200" />
                                    <p className="text-gray-400 text-[10px] md:text-xs tracking-[0.3em] uppercase font-medium">
                                        BASED IN {location}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Brand Concept & Vision */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="space-y-4"
                        >
                            <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase text-gray-400">{t.about.conceptTitle}</h3>
                            <p className="text-gray-700 text-sm md:text-base leading-relaxed font-light">
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
                            <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase text-gray-400">{t.about.visionTitle}</h3>
                            <p className="text-gray-700 text-sm md:text-base leading-relaxed font-light italic">
                                {t.about.visionText}
                            </p>
                        </motion.div>
                    </div>

                    <section
                        className="text-gray-800 text-lg md:text-xl font-normal leading-relaxed whitespace-pre-wrap max-w-2xl pt-8 relative"
                    >
                        <div className="absolute -left-6 top-8 w-1 h-12 bg-gray-100 hidden md:block" />
                        <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase text-gray-400 mb-6">{t.about.biographyTitle}</h3>
                        <div className="font-light" style={{ lineHeight: 2, letterSpacing: '0.02em' }}>
                            {bio || t.about.biographyText}
                        </div>
                    </section>

                    <GearSection profile={profile} />

                    <footer className="pt-16 opacity-20">
                        <div className="h-px w-24 bg-gray-900" />
                    </footer>
                </motion.div>
            </div>
        </main>
    );
}
