"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const CATEGORIES = [
    { id: 'cosplay' },
    { id: 'portrait' },
    { id: 'snapshot' },
    { id: 'landscape' },
    { id: 'animal' },
];

export default function CategoryFilter({ currentCategory }: { currentCategory: string }) {
    const router = useRouter();
    const { t } = useLanguage();

    const handleCategoryChange = (slug: string) => {
        router.push(`/portfolio?category=${slug}`);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4 md:gap-8 border-b border-gray-100 pb-8"
        >
            {CATEGORIES.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`text-xs md:text-sm tracking-[0.2em] uppercase transition-all duration-300 relative py-2 ${currentCategory === cat.id
                        ? 'text-black font-bold'
                        : 'text-gray-400 hover:text-black'
                        }`}
                >
                    {t.portfolio.categories[cat.id as keyof typeof t.portfolio.categories] || cat.id.toUpperCase()}
                    {currentCategory === cat.id && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
                        />
                    )}
                </button>
            ))}
        </motion.div>
    );
}
