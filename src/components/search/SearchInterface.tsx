"use client";

import { Configure, RefinementList, useHits, SearchBox, Pagination, CurrentRefinements, ClearRefinements, useInstantSearch } from "react-instantsearch";
import { InstantSearchNext } from "react-instantsearch-nextjs";
import { getSearchClient } from "@/lib/algolia";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Filter, X, Search as SearchIcon, Tag, MapPin, Grid } from "lucide-react";
import { clsx } from "clsx";
import cloudinaryLoader from "@/lib/cloudinary-loader";

const searchClient = getSearchClient();

function Hit({ hit }: { hit: any }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="break-inside-avoid relative group mb-4"
        >
            <Link href={`/portfolio?img=${hit.objectID}`} className="block overflow-hidden relative rounded-sm shadow-sm group">
                <Image
                    loader={cloudinaryLoader}
                    src={hit.url}
                    alt={hit.title}
                    width={800}
                    height={1000}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-5 text-left">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-white/70 mb-1">
                        {hit.category}
                    </p>
                    <h3 className="text-sm font-serif tracking-[0.1em] text-white">
                        {hit.title}
                    </h3>
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
    const { status } = useInstantSearch();

    if (status === 'loading' || status === 'stalled') {
        return <SearchSkeleton />;
    }

    if (hits.length === 0) {
        return (
            <div className="text-center py-20 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-xl text-gray-400 font-serif italic">
                    No results found for your filters.
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
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
            <AnimatePresence>
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

    return (
        <InstantSearchNext
            searchClient={searchClient}
            indexName="photos"
            routing={true}
            initialUiState={{
                photos: {
                    query: initialQuery
                }
            }}
        >
            <Configure hitsPerPage={12} />

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
                            <h2 className="text-2xl font-serif font-bold mb-2">Filters</h2>
                            <p className="text-xs text-gray-400 tracking-widest uppercase">Refine your search</p>
                        </div>

                        <SidebarFilter title="Categories" attribute="category" icon={Grid} />
                        <SidebarFilter title="Locations" attribute="location" icon={MapPin} />
                        <SidebarFilter title="Tags" attribute="tags" icon={Tag} />

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
                        {/* Search Input Box */}
                        <div className="mb-6">
                            <SearchBox
                                placeholder="モデル名や場所、タグで検索..."
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
