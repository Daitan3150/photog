"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const CATEGORIES = [
    { id: 'all', name: 'ALL', nameJa: '全て' },
    { id: 'cosplay', name: 'COSPLAY', nameJa: 'コスプレ' },
    { id: 'portrait', name: 'PORTRAIT', nameJa: 'ポートレート' },
    { id: 'snapshot', name: 'SNAPSHOT', nameJa: 'スナップ' },
    { id: 'landscape', name: 'LANDSCAPE', nameJa: '風景' },
    { id: 'animal', name: 'ANIMAL', nameJa: '動物' },
];

export default function CategoryFilter({ currentCategory }: { currentCategory: string }) {
    const router = useRouter();

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
                    {cat.name}
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
