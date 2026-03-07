"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { clsx } from "clsx";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { getSearchClient } from "@/lib/algolia";
import Image from "next/image";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function SearchButton() {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const { t } = useLanguage();

    // Instant search on query change (Algolia)
    useEffect(() => {
        const performSearch = async () => {
            if (searchQuery.trim().length >= 2) {
                setIsLoading(true);
                try {
                    const searchClient = getSearchClient();
                    const { results } = await searchClient.search({
                        requests: [
                            {
                                indexName: 'photos',
                                query: searchQuery,
                                hitsPerPage: 5,
                            }
                        ]
                    });
                    const hits = (results[0] as any).hits || [];
                    setSearchResults(hits);
                } catch (error) {
                    console.error('Algolia Search Error:', error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setSearchResults([]);
            }
        };

        const timer = setTimeout(performSearch, 300); // Debounce
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // InstantSearch の URL routing 形式に合わせる
            router.push(`/search?photos%5Bquery%5D=${encodeURIComponent(searchQuery)}`);
            setIsSearchOpen(false);
            setSearchQuery("");
            setSearchResults([]);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsSearchOpen(true)}
                className="text-gray-900 hover:text-gray-600 transition-colors"
                aria-label="Search"
            >
                <Search size={28} strokeWidth={1} />
            </button>

            <AnimatePresence>
                {isSearchOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-white/95 backdrop-blur-md z-[60] flex flex-col items-center pt-24 px-6 overflow-y-auto"
                    >
                        <button
                            onClick={() => setIsSearchOpen(false)}
                            className="absolute top-6 right-6 md:top-10 md:right-10 text-gray-900 hover:text-gray-600"
                        >
                            <X size={32} strokeWidth={1} />
                        </button>

                        <form onSubmit={handleSearch} className="w-full max-w-3xl relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t.common.searchPlaceholder}
                                className="w-full bg-transparent border-b-2 border-gray-200 text-3xl md:text-5xl font-serif py-4 focus:outline-none focus:border-black placeholder:text-gray-300 transition-colors"
                            />
                            {isLoading && (
                                <div className="absolute right-0 bottom-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                                </div>
                            )}
                        </form>

                        {/* Instant Search Results */}
                        <div className="w-full max-w-3xl mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                            {searchResults.map((photo) => (
                                <Link
                                    key={photo.objectID}
                                    href={`/search?q=${encodeURIComponent(photo.subjectName || photo.title || photo.location)}`}
                                    onClick={() => setIsSearchOpen(false)}
                                    className="flex items-center gap-4 group cursor-pointer"
                                >
                                    <div className="relative w-20 h-20 overflow-hidden rounded-md bg-gray-100 flex-shrink-0">
                                        <Image
                                            src={photo.url}
                                            alt={photo.title || photo.subjectName}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-xl font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                                            {photo.subjectName || photo.title || 'Untitled'}
                                        </h4>
                                        <p className="text-sm text-gray-500 truncate">
                                            {photo.characterName ? `${photo.characterName} • ` : ''}
                                            {photo.location}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                            {searchQuery && searchQuery.length >= 2 && searchResults.length === 0 && !isLoading && (
                                <p className="text-gray-400 text-center col-span-full mt-4">{t.common.noResults}</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}


export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const { language, toggleLanguage, t } = useLanguage();

    const navItems = [
        { name: t.nav.home === 'ホーム' ? 'Portfolio' : 'Portfolio', href: "/portfolio" },
        // { name: 'Blog', href: "/blog" }, // Temporarily disabled
        { name: t.about.title, href: "/about" },
        { name: t.hero.contact, href: "/contact" },
    ];

    // Hide header on admin and dashboard pages
    if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) return null;

    return (
        <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between p-4 md:p-10 pointer-events-none">
            {/* Logo */}
            <div className="pointer-events-auto">
                <Link href="/" className="text-xl md:text-2xl font-bold tracking-widest font-serif">
                    DAITAN
                </Link>
            </div>

            {/* Actions */}
            <div className="pointer-events-auto flex items-center gap-4 md:gap-6">
                <button
                    onClick={toggleLanguage}
                    className="text-sm font-medium tracking-widest hover:opacity-60 transition-opacity w-8"
                >
                    {language === 'ja' ? 'EN' : 'JP'}
                </button>
                <SearchButton />
                <button
                    onClick={() => setIsOpen(true)}
                    className="text-gray-900 hover:text-gray-600 transition-colors"
                    aria-label="Open Menu"
                >
                    <Menu size={32} strokeWidth={1} />
                </button>
            </div>


            {/* Full Screen Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[60] flex flex-col items-center justify-center pointer-events-auto"
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-6 right-6 md:top-10 md:right-10 text-gray-900 hover:text-gray-600 transition-colors"
                            aria-label="Close Menu"
                        >
                            <X size={32} strokeWidth={1} />
                        </button>

                        {/* Nav Items */}
                        <nav className="flex flex-col items-center gap-8">
                            {navItems.map((item, index) => (
                                <motion.div
                                    key={item.href}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                                >
                                    <Link
                                        href={item.href}
                                        onClick={() => setIsOpen(false)} // Close menu on click
                                        className={clsx(
                                            "text-3xl md:text-5xl font-serif tracking-widest transition-colors duration-300",
                                            pathname === item.href
                                                ? "text-black"
                                                : "text-gray-400 hover:text-black"
                                        )}
                                    >
                                        {item.name}
                                    </Link>
                                </motion.div>
                            ))}
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
