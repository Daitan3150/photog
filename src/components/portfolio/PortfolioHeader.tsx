"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function PortfolioHeader() {
    const { t } = useLanguage();

    return (
        <header className="mb-16 text-center">
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-gray-400 uppercase tracking-[0.4em] text-xs mb-4"
            >
                {t.portfolio.subtitle}
            </motion.p>
            <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-6xl font-serif font-bold text-gray-900 mb-12"
            >
                {t.portfolio.title}
            </motion.h1>
        </header>
    );
}
