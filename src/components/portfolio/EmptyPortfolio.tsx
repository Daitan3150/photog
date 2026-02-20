"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function EmptyPortfolio() {
    const { language } = useLanguage();

    return (
        <div className="flex flex-col items-center justify-center py-32 space-y-8 relative overflow-hidden">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.1 }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                className="absolute w-96 h-96 border border-black rounded-full pointer-events-none"
            />
            <motion.div
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.05 }}
                transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
                className="absolute w-[30rem] h-[30rem] border border-black rounded-full pointer-events-none"
            />

            <div className="text-center relative z-10">
                <motion.h2
                    initial={{ opacity: 0, letterSpacing: "0.2em" }}
                    animate={{ opacity: 1, letterSpacing: "0.5em" }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="text-4xl md:text-6xl font-serif text-black uppercase font-extralight mb-6"
                >
                    COMING SOON
                </motion.h2>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100px" }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-px bg-black mx-auto mb-6"
                />
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1 }}
                    className="text-gray-400 font-light tracking-[0.2em] text-xs md:text-sm uppercase"
                >
                    {language === 'ja' ? '次の物語を準備中...' : 'Tailoring the next story...'}
                </motion.p>
            </div>
        </div>
    );
}
