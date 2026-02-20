"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function Hero() {
    const { t } = useLanguage();

    return (
        <section className="relative w-full h-[100dvh] flex items-center justify-center overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/images/hero.png"
                    alt="Hero Background"
                    fill
                    className="object-cover"
                    priority
                    sizes="100vw"
                />
                {/* Overlay for text readability */}
                <div className="absolute inset-0 bg-black/30" />
            </div>

            <div className="relative z-10 text-center text-white p-4 flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="w-32 h-32 md:w-56 md:h-56 mb-6 relative"
                >
                    <Image
                        src="/logo.png"
                        alt="DAITAN Logo"
                        fill
                        className="object-contain filter drop-shadow-2xl brightness-0 invert"
                    />
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                    className="text-4xl md:text-8xl font-serif tracking-widest uppercase mb-4"
                >
                    Daitan
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1, ease: "easeOut" }}
                    className="text-lg md:text-xl font-light tracking-[0.2em] font-sans uppercase"
                >
                    {t.common.portfolio}
                </motion.p>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2, duration: 1 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            >
                <span className="text-xs tracking-widest uppercase opacity-80">{t.hero.scroll}</span>
                <div className="w-[1px] h-20 bg-white/50 overflow-hidden">
                    <motion.div
                        className="w-full h-1/2 bg-white"
                        animate={{ y: ["-100%", "100%"] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                </div>
            </motion.div>
        </section>
    );
}
