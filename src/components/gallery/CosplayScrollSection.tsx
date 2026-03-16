"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { User, ChevronRight, Sparkles, Calendar } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Lightbox from "./Lightbox";

interface Photo {
    id: string;
    url: string;
    title: string;
    category: string;
    subjectName?: string;
    uploaderName?: string;
    uploaderPhotoURL?: string;
    nextPhotoUrl?: string | null;
    prevPhotoUrl?: string | null;
    location?: string;
    snsUrl?: string;
    characterName?: string;
    seriesName?: string;
    event?: string;
    displayMode?: 'title' | 'character';
    aspectRatio?: number;
    exif?: {
        Model?: string;
        LensModel?: string;
        FNumber?: number;
        ExposureTime?: number;
        ISO?: number;
        FocalLength?: number;
    };
}

interface CosplayScrollSectionProps {
    modelName: string;
    photos: Photo[];
}

export default function CosplayScrollSection({ modelName, photos }: CosplayScrollSectionProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const selectedId = searchParams.get('img');
    const selectedPhotoIndex = photos.findIndex(p => p.id === selectedId);
    let selectedPhoto = selectedPhotoIndex !== -1 ? photos[selectedPhotoIndex] : null;

    if (selectedPhoto) {
        selectedPhoto = {
            ...selectedPhoto,
            nextPhotoUrl: selectedPhotoIndex < photos.length - 1 ? photos[selectedPhotoIndex + 1]?.url || null : null,
            prevPhotoUrl: selectedPhotoIndex > 0 ? photos[selectedPhotoIndex - 1]?.url || null : null
        };
    }

    const closeLightbox = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('img');
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const nextPhoto = () => {
        if (selectedPhotoIndex < photos.length - 1) {
            const nextId = photos[selectedPhotoIndex + 1].id;
            const params = new URLSearchParams(searchParams.toString());
            params.set('img', nextId);
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        }
    };

    const prevPhoto = () => {
        if (selectedPhotoIndex > 0) {
            const prevId = photos[selectedPhotoIndex - 1].id;
            const params = new URLSearchParams(searchParams.toString());
            params.set('img', prevId);
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        }
    };

    // Collect unique character names and series for this group
    const characterNames = [...new Set(photos.map(p => p.characterName).filter(Boolean))];
    const seriesNames = [...new Set(photos.map(p => p.seriesName).filter(Boolean))];
    const eventNames = [...new Set(photos.map(p => p.event).filter(Boolean))];

    return (
        <section className="mb-28 last:mb-0 overflow-hidden">
            {/* Cosplay Header - Purple/Pink Gradient Theme */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 px-6 md:px-0 gap-4">
                <div className="relative">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        <span className="text-[10px] md:text-xs text-purple-400 uppercase tracking-[0.5em] block mb-2 font-light flex items-center gap-2">
                            <Sparkles size={12} className="text-amber-400" />
                            Cosplayer
                        </span>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 leading-none">
                            {modelName}
                        </h2>

                        {/* Character / Series Tags */}
                        <div className="flex flex-wrap gap-2 mt-4">
                            {characterNames.map(name => (
                                <span
                                    key={name}
                                    className="text-[9px] md:text-[10px] bg-purple-50 text-purple-600 px-3 py-1 rounded-full border border-purple-100 font-bold tracking-wider"
                                >
                                    {name}
                                </span>
                            ))}
                            {seriesNames.map(name => (
                                <span
                                    key={name}
                                    className="text-[9px] md:text-[10px] bg-pink-50 text-pink-600 px-3 py-1 rounded-full border border-pink-100 font-medium tracking-wider"
                                >
                                    {name}
                                </span>
                            ))}
                            {eventNames.map(name => (
                                <span
                                    key={name}
                                    className="text-[9px] md:text-[10px] bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-100 font-medium tracking-wider flex items-center gap-1"
                                >
                                    <Calendar size={10} />
                                    {name}
                                </span>
                            ))}
                        </div>

                        <div className="w-12 h-[2px] bg-gradient-to-r from-purple-500 to-pink-500 mt-4 rounded-full" />
                    </motion.div>
                </div>

                <div className="flex items-center gap-3 text-purple-300 text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-medium opacity-60">
                    {photos.length} photos — Slide to view <ChevronRight size={14} className="animate-pulse" />
                </div>
            </div>

            {/* Horizontal Scroll Container */}
            <div className="relative group/container">
                {/* Fade Edges */}
                <div className="absolute inset-y-0 left-0 w-12 md:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-12 md:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

                <div
                    className="flex overflow-x-auto pb-12 gap-6 md:gap-8 px-12 md:px-0 no-scrollbar snap-x snap-mandatory scroll-smooth cursor-grab active:cursor-grabbing"
                >
                    {photos.map((photo, index) => (
                        <CosplayPhotoItem
                            key={photo.id}
                            photo={photo}
                            index={index}
                            searchParams={searchParams}
                            modelName={modelName}
                        />
                    ))}

                    {/* End Spacer */}
                    <div className="flex-shrink-0 w-20 md:w-32" />
                </div>

                {/* Scroll Indicator line - Gradient */}
                <div className="absolute bottom-4 left-6 md:left-0 right-6 md:right-0 h-[2px] bg-purple-50 overflow-hidden rounded-full">
                    <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 w-full origin-left rounded-full"
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                    />
                </div>
            </div>

            <AnimatePresence>
                {selectedPhoto && (
                    <Lightbox
                        photo={selectedPhoto as any}
                        onClose={closeLightbox}
                        onNext={selectedPhotoIndex < photos.length - 1 ? nextPhoto : undefined}
                        onPrev={selectedPhotoIndex > 0 ? prevPhoto : undefined}
                    />
                )}
            </AnimatePresence>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </section>
    );
}

function CosplayPhotoItem({ photo, index, searchParams, modelName }: {
    photo: Photo,
    index: number,
    searchParams: any,
    modelName: string
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 1, delay: index * 0.05, ease: "easeOut" }}
            className="flex-shrink-0 w-[80vw] md:w-[480px] snap-center first:ml-0"
        >
            {/* Cosplay Gradient Border */}
            <div className="p-[2px] bg-gradient-to-br from-purple-500 via-pink-500 to-amber-500 rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 transition-shadow duration-500">
                <Link
                    href={`/portfolio?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), img: photo.id }).toString()}`}
                    className="block relative aspect-[3/4] overflow-hidden rounded-[10px] group/item bg-black"
                >
                    <Image
                        loader={cloudinaryLoader}
                        src={photo.url}
                        alt={photo.characterName || photo.title || modelName}
                        fill
                        className="object-cover transition-transform duration-[2s] ease-out group-hover/item:scale-105"
                        sizes="(max-width: 768px) 80vw, 480px"
                        priority={index < 2}
                    />

                    {/* Cosplay Sparkle Badge */}
                    <div className="absolute top-4 right-4 z-30 pointer-events-none">
                        <div className="bg-white/10 backdrop-blur-md p-2 rounded-full border border-white/20">
                            <Sparkles className="w-4 h-4 text-white fill-amber-300" />
                        </div>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    {/* Bottom Content */}
                    <div className="absolute bottom-0 right-0 left-0 p-5 md:p-6 flex flex-col gap-2 transition-all duration-500 md:translate-y-4 md:opacity-0 group-hover/item:translate-y-0 group-hover/item:opacity-100 z-10">
                        {/* Character Name */}
                        {photo.characterName && (
                            <p className="text-amber-300 text-[10px] md:text-xs font-bold tracking-wider uppercase drop-shadow-md">
                                {photo.characterName}
                                {photo.seriesName && (
                                    <span className="text-white/50 font-normal ml-2">
                                        — {photo.seriesName}
                                    </span>
                                )}
                            </p>
                        )}

                        {/* Event Name */}
                        {photo.event && (
                            <p className="text-purple-300 text-[9px] font-medium tracking-wider flex items-center gap-1.5">
                                <Calendar size={10} className="opacity-70" />
                                {photo.event}
                            </p>
                        )}

                        {/* Title & Uploader */}
                        <div className="flex items-end justify-between mt-1">
                            <div className="flex flex-col">
                                <p className="text-white text-[11px] md:text-sm font-serif tracking-[0.1em] drop-shadow-md">
                                    {photo.title || "Untitled"}
                                </p>
                                {photo.location && (
                                    <p className="text-white/30 text-[8px] md:text-[9px] uppercase tracking-widest mt-0.5">
                                        {photo.location}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-lg">
                                <span className="text-white text-[8px] md:text-[9px] font-bold tracking-wider leading-none">
                                    {photo.uploaderName || "Creator"}
                                </span>
                                <div className="relative w-5 h-5 rounded-full overflow-hidden border border-white/40 bg-white/10 shrink-0">
                                    {photo.uploaderPhotoURL ? (
                                        <img
                                            src={photo.uploaderPhotoURL}
                                            alt={photo.uploaderName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[8px] text-white/50">
                                            <User size={12} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Aesthetic Corner Border on Hover */}
                    <div className="absolute top-5 right-5 w-8 h-8 border-t-2 border-r-2 border-amber-400/60 opacity-0 group-hover/item:opacity-100 transition-all duration-700 scale-90 group-hover/item:scale-100" />
                    <div className="absolute bottom-5 left-5 w-8 h-8 border-b-2 border-l-2 border-purple-400/60 opacity-0 group-hover/item:opacity-100 transition-all duration-700 scale-90 group-hover/item:scale-100" />
                </Link>
            </div>
        </motion.div>
    );
}
