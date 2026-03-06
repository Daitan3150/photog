"use client";

import { Configure, RefinementList, useHits, SearchBox, Pagination, CurrentRefinements, ClearRefinements, useInstantSearch } from "react-instantsearch";
import { InstantSearchNext } from "react-instantsearch-nextjs";
import { getSearchClient } from "@/lib/algolia";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import { Filter, X, Search as SearchIcon, Tag, MapPin, Grid, User, Calendar, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const searchClient = getSearchClient();

function Hit({ hit }: { hit: any }) {
    const isCosplay = (hit.category?.toLowerCase() === 'cosplay' || hit.categoryId?.toLowerCase() === 'cosplay');

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={clsx(
                "break-inside-avoid relative group mb-4 rounded-lg overflow-hidden",
                isCosplay && "p-[2px] bg-gradient-to-br from-purple-500 via-pink-500 to-amber-500 shadow-lg shadow-purple-200/50"
            )}
        >
            <Link href={`/portfolio?img=${hit.objectID}`} className="block overflow-hidden relative rounded-sm bg-white group">
                <Image
                    loader={cloudinaryLoader}
                    src={hit.url}
                    alt={hit.title}
                    width={800}
                    height={1000}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
                />

                {isCosplay && (
                    <div className="absolute top-3 right-3 z-10">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            className="bg-white/20 backdrop-blur-md p-1.5 rounded-full border border-white/40"
                        >
                            <Sparkles className="w-4 h-4 text-white fill-amber-300" />
                        </motion.div>
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-5 text-left">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={clsx(
                            "text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-full text-white/90",
                            isCosplay ? "bg-purple-600" : "bg-black/40 backdrop-blur-sm"
                        )}>
                            {hit.category}
                        </span>
                    </div>
                    <h3 className="text-sm font-serif tracking-[0.1em] text-white line-clamp-1">
                        {hit.title}
                    </h3>
                    {hit.subjectName && (
                        <p className="text-[10px] text-white/60 mt-1 flex items-center gap-1.5 italic font-light">
                            <User className="w-3 h-3" /> {hit.subjectName}
                        </p>
                    )}
                    {hit.event && (
                        <p className="text-[10px] text-amber-300/80 mt-0.5 flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3 h-3" /> {hit.event}
                        </p>
                    )}
                </div>
            </Link>
        </motion.div>
    );
}

function SearchSkeleton() {
    return (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="break-inside-avoid mb-4 animate-pulse">
                    <div className="aspect-[3/4] bg-gray-100 rounded-sm" />
                    <div className="mt-3 space-y-2">
                        <div className="h-2 bg-gray-100 rounded w-1/4" />
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function CustomHits() {
    const { hits } = useHits();
    const { status, error } = useInstantSearch();

    // Debugging
    console.log('[Search] status:', status, 'hits:', hits.length, 'error:', error);

    // Only show skeleton if we have no hits at all and we are loading
    const isLoading = status === 'loading' || status === 'stalled';

    if (isLoading && hits.length === 0) {
        return <SearchSkeleton />;
    }

    if (hits.length === 0 && !isLoading) {
        return (
            <div className="text-center py-20 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-xl text-gray-400 font-serif italic">
                    No results found.
                </p>
                <ClearRefinements
                    translations={{
                        resetButtonText: 'Clear all filters',
                    }}
                    className="mt-4"
                />
            </div>
        );
    }

    return (
        <div className={clsx(
            "columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4 transition-opacity duration-300",
            status === 'stalled' ? "opacity-70" : "opacity-100"
        )}>
            <AnimatePresence mode="popLayout">
                {hits.map((hit) => (
                    <Hit key={hit.objectID} hit={hit} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function SidebarFilter({ title, attribute, icon: Icon }: { title: string, attribute: string, icon: any }) {
    return (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                <Icon className="w-4 h-4 text-gray-400" />
                <h3 className="text-xs uppercase tracking-[0.2em] font-medium text-gray-500">{title}</h3>
            </div>
            <RefinementList
                attribute={attribute}
                className="search-refinement-list"
                classNames={{
                    list: "space-y-2",
                    item: "flex items-center group",
                    label: "flex items-center w-full cursor-pointer text-sm text-gray-600 hover:text-black transition-colors",
                    checkbox: "mr-3 rounded border-gray-300 text-black focus:ring-black",
                    labelText: "flex-1",
                    count: "ml-auto text-[10px] text-gray-400 font-mono",
                    selectedItem: "font-bold text-black"
                }}
            />
        </div>
    );
}

export default function SearchInterface({ initialQuery = '' }: { initialQuery?: string }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchMode, setSearchMode] = useState<'model' | 'event' | 'location'>('model');
    const { t } = useLanguage();

    // 💡 Stabilize initial UI state to prevent flashing when URL syncs back
    const initialUiState = useMemo(() => ({
        photos: {
            query: initialQuery
        }
    }), []); // Only calculate once on mount

    return (
        <InstantSearchNext
            searchClient={searchClient}
            indexName="photos"
            routing={true}
            initialUiState={initialUiState}
        >
            <Configure
                hitsPerPage={12}
                restrictSearchableAttributes={
                    searchMode === 'model' ? ['subjectName'] :
                        searchMode === 'event' ? ['event'] :
                            searchMode === 'location' ? ['location'] :
                                undefined
                }
            />

            <div className="flex flex-col lg:flex-row gap-12">
                {/* Mobile Filter Toggle */}
                <div className="lg:hidden flex justify-between items-center mb-6">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm tracking-widest uppercase"
                    >
                        <Filter className="w-4 h-4" /> Filters
                    </button>
                    <CurrentRefinements />
                </div>

                {/* Sidebar - Desktop */}
                <aside className={clsx(
                    "lg:w-64 flex-shrink-0",
                    "fixed inset-0 z-[60] bg-white p-8 lg:relative lg:p-0 lg:block transition-transform duration-500 ease-in-out",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}>
                    {isSidebarOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
                    <div className="lg:hidden flex justify-end mb-8">
                        <button onClick={() => setIsSidebarOpen(false)}>
                            <X className="w-8 h-8" />
                        </button>
                    </div>

                    <div className="sticky top-24">
                        <div className="mb-10">
                            <h2 className="text-2xl font-serif font-bold mb-2">{t.search.filters}</h2>
                            <p className="text-xs text-gray-400 tracking-widest uppercase">{t.search.refine}</p>
                        </div>

                        <SidebarFilter title={t.search.categories} attribute="category" icon={Grid} />
                        <SidebarFilter title={t.search.models} attribute="subjectName" icon={User} />
                        <SidebarFilter title={t.search.events} attribute="event" icon={Calendar} />
                        <SidebarFilter title={t.search.locations} attribute="location" icon={MapPin} />
                        <SidebarFilter title={t.search.tags} attribute="tags" icon={Tag} />

                        <div className="mt-10 pt-6 border-t border-gray-100">
                            <ClearRefinements
                                classNames={{
                                    button: "w-full py-3 text-xs tracking-widest uppercase border border-gray-200 hover:bg-gray-50 transition-colors rounded-sm"
                                }}
                            />
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1">
                    <div className="mb-8">
                        {/* Search Mode Toggle */}
                        <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
                            {[
                                { id: 'model', label: t.search.modeModel, icon: User },
                                { id: 'event', label: t.search.modeEvent, icon: Calendar },
                                { id: 'location', label: t.search.modeLocation, icon: MapPin },
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setSearchMode(mode.id as any)}
                                    className={clsx(
                                        "flex items-center gap-2 px-4 py-2 rounded-md text-xs tracking-widest transition-all",
                                        searchMode === mode.id
                                            ? "bg-white text-black shadow-sm font-bold"
                                            : "text-gray-500 hover:text-black"
                                    )}
                                >
                                    <mode.icon className="w-3 h-3" />
                                    {mode.label}
                                </button>
                            ))}
                        </div>

                        {/* Search Input Box */}
                        <div className="mb-6">
                            <SearchBox
                                placeholder={
                                    searchMode === 'model' ? t.search.modelPlaceholder :
                                        searchMode === 'event' ? t.search.eventPlaceholder :
                                            searchMode === 'location' ? t.search.locationPlaceholder :
                                                t.search.placeholder
                                }
                                onSubmit={(e) => {
                                    e.preventDefault();
                                }}
                                classNames={{
                                    root: "relative w-full",
                                    form: "relative flex items-center w-full",
                                    input: "w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all",
                                    submit: "absolute left-4 text-gray-400 hover:text-black transition-colors",
                                    reset: "absolute right-4 text-gray-400 hover:text-black transition-colors",
                                    submitIcon: "w-5 h-5",
                                    resetIcon: "w-4 h-4"
                                }}
                            />
                        </div>

                        <CurrentRefinements
                            classNames={{
                                list: "flex flex-wrap gap-2",
                                item: "flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-[10px] uppercase tracking-wider",
                                category: "font-semibold mr-1 capitalize",
                                delete: "ml-1 text-gray-400 hover:text-black transition-colors"
                            }}
                        />
                    </div>

                    <CustomHits />

                    <div className="mt-20 py-10 border-t border-gray-100 flex justify-center">
                        <Pagination
                            classNames={{
                                list: "flex gap-2",
                                item: "min-w-[40px] h-[40px]",
                                link: "w-full h-full flex items-center justify-center border border-gray-200 text-sm hover:bg-gray-50 transition-colors rounded-sm",
                                selectedItem: "bg-black border-black text-white hover:bg-black",
                                disabledItem: "opacity-30 pointer-events-none"
                            }}
                        />
                    </div>
                </main>
            </div>
        </InstantSearchNext>
    );
}
