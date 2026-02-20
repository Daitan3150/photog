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
        <section className="pt-16 border-t border-gray-100">
            <h2 className="text-[10px] font-bold tracking-[0.6em] mb-12 uppercase text-gray-400">Equipments</h2>
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
                                ABOUT
                            </motion.h1>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-4xl md:text-5xl font-serif text-gray-900">{name}</h2>
                            <div className="flex flex-col gap-3">
                                <p className="text-gray-900 font-bold tracking-[0.4em] text-sm uppercase">
                                    {role}
                                </p>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-[1px] bg-gray-300" />
                                    <p className="text-gray-500 text-xs tracking-[0.2em] uppercase font-medium">
                                        BASED IN {location}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </header>

                    <section
                        className="text-gray-800 text-lg md:text-xl font-normal leading-relaxed whitespace-pre-wrap max-w-2xl"
                        style={{ lineHeight: 1.9, letterSpacing: '0.015em' }}
                    >
                        {bio || (isJa
                            ? "自己紹介文はまだ準備中です。フォトグラファーとしての活動や、自身の核となる想いをここに綴ります。"
                            : "Bio is currently being tailored. I will share my journey and creative vision here soon.")
                        }
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
