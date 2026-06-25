"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { User, ChevronRight, Camera, Sparkles } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useRef } from "react";
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

interface PortraitScrollSectionProps {
    modelName: string;
    photos: Photo[];
    birthday?: string;
    birthYear?: string;
    birthMonth?: string;
    birthDay?: string;
    approximateAge?: string;
    showBirthYear?: boolean;
    deceasedDate?: string;
    deceasedYear?: string;
    deceasedMonth?: string;
    deceasedDay?: string;
    realName?: string;
}

export default function PortraitScrollSection({ 
    modelName, photos, 
    birthday, birthYear, birthMonth, birthDay, approximateAge, showBirthYear,
    deceasedDate, deceasedYear, deceasedMonth, deceasedDay, realName
}: PortraitScrollSectionProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedId = searchParams.get('img');
    const selectedPhotoIndex = photos.findIndex(p => p.id === selectedId);
    let selectedPhoto = selectedPhotoIndex !== -1 ? photos[selectedPhotoIndex] : null;

    // Next/Prev logic for Lightbox
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

    return (
        <section className="mb-32 last:mb-0 overflow-hidden">
            {/* Model Header - Elegant and Premium */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 px-6 md:px-0 gap-4">
                <div className="relative">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        <span className="text-[10px] md:text-xs text-neutral-400 uppercase tracking-[0.5em] block mb-2 font-light">
                            Featured Model
                        </span>
                        <h2 className="text-3xl md:text-5xl font-serif tracking-[0.05em] text-neutral-900 lowercase italic first-letter:uppercase leading-none">
                            {modelName}
                            {realName && realName !== modelName && (
                                <span className="text-xl md:text-3xl ml-4 font-normal text-neutral-500 italic">
                                    ({realName})
                                </span>
                            )}
                        </h2>

                        {/* 生没年表示 */}
                        {(birthday || deceasedDate || birthMonth || approximateAge) && (() => {
                            const hasDeceased = !!(deceasedDate || deceasedMonth);
                            const showYear = showBirthYear && !!birthYear;

                            const formatB = () => {
                                if (showYear && birthYear && birthMonth && birthDay) return `${birthYear}.${birthMonth}.${birthDay}`;
                                if (showYear && birthYear && birthMonth) return `${birthYear}.${birthMonth}`;
                                if (showYear && birthYear) return `${birthYear}`;
                                if (birthMonth && birthDay) return `${birthMonth}/${birthDay}`;
                                if (birthday && !showYear) {
                                    const parts = birthday.split('-');
                                    return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : birthday.replace(/-/g, '.');
                                }
                                if (birthday) return birthday.replace(/-/g, '.');
                                return '????';
                            };

                            const formatD = () => {
                                if (deceasedYear && deceasedMonth && deceasedDay) return `${deceasedYear}.${deceasedMonth}.${deceasedDay}`;
                                if (deceasedMonth && deceasedDay) return `${deceasedMonth}.${deceasedDay}`;
                                if (deceasedDate) return deceasedDate.replace(/-/g, '.');
                                return '';
                            };

                            const calcAge = (() => {
                                if (approximateAge) return parseInt(approximateAge);
                                const refDate = (deceasedDate || (deceasedYear && deceasedMonth && deceasedDay))
                                    ? new Date(deceasedDate || `${deceasedYear}-${deceasedMonth}-${deceasedDay}`)
                                    : new Date();
                                if (birthYear && birthMonth && birthDay) {
                                    const bY = parseInt(birthYear), bM = parseInt(birthMonth), bD = parseInt(birthDay);
                                    const dY = refDate.getFullYear(), dM = refDate.getMonth() + 1, dD = refDate.getDate();
                                    let a = dY - bY;
                                    if (dM < bM || (dM === bM && dD < bD)) a--;
                                    return a;
                                }
                                if (birthday) {
                                    const b = new Date(birthday);
                                    if (!isNaN(b.getTime())) {
                                        let a = refDate.getFullYear() - b.getFullYear();
                                        const m = refDate.getMonth() - b.getMonth();
                                        if (m < 0 || (m === 0 && refDate.getDate() < b.getDate())) a--;
                                        return a;
                                    }
                                }
                                return null;
                            })();

                            const ageLabel = (() => {
                                if (calcAge === null) return null;
                                if (hasDeceased) return `享年 ${calcAge} 歳`;
                                if (calcAge >= 20) return `${calcAge}↗︎`;
                                return `${calcAge}`;
                            })();

                            if (hasDeceased) {
                                return (
                                    <div className="mt-3 flex items-center gap-3">
                                        <div className="flex flex-col gap-0.5">
                                            <p className="text-[11px] text-neutral-400 font-light tracking-[0.3em] uppercase">
                                                {formatB()}
                                                <span className="mx-2 text-neutral-300">—</span>
                                                {formatD()}
                                            </p>
                                            {ageLabel && (
                                                <p className="text-[10px] text-neutral-500 tracking-widest font-serif italic">
                                                    {ageLabel}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            } else if (birthday || birthMonth) {
                                return (
                                    <div className="mt-3 flex items-center gap-3">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-3">
                                                <p className={`font-medium ${
                                                    showYear
                                                        ? 'text-[11px] text-neutral-400 tracking-[0.3em] uppercase font-light'
                                                        : 'text-[22px] md:text-[28px] text-neutral-800 font-black tracking-tight'
                                                }`}>
                                                    {!showYear && (
                                                        <span className="text-[9px] text-neutral-300 mr-2 font-light tracking-[0.4em] uppercase">b.</span>
                                                    )}
                                                    {formatB()}
                                                </p>
                                                {ageLabel && (
                                                    <span className="text-[13px] md:text-[15px] text-neutral-600 font-bold tracking-widest bg-neutral-200/60 px-3 py-1.5 rounded-full shadow-sm">
                                                        {ageLabel}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            } else if (approximateAge && ageLabel) {
                                // 生年月日不明だが大体の年齢が入力されている場合
                                return (
                                    <div className="mt-3 flex items-center gap-3">
                                        <span className="text-[13px] md:text-[15px] text-neutral-600 font-bold tracking-widest bg-neutral-200/60 px-3 py-1.5 rounded-full shadow-sm">
                                            {ageLabel}
                                        </span>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                        <div className="w-12 h-[1px] bg-neutral-900 mt-4 opacity-20" />
                    </motion.div>
                </div>

                <div className="flex items-center gap-3 text-neutral-300 text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-medium opacity-60">
                    Slide to view gallery <ChevronRight size={14} className="animate-pulse" />
                </div>
            </div>

            {/* Horizontal Scroll Container */}
            <div className="relative group/container">
                {/* Fade Edges */}
                <div className="absolute inset-y-0 left-0 w-12 md:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-12 md:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

                <div
                    className="flex overflow-x-auto pb-12 gap-8 md:gap-12 px-12 md:px-0 no-scrollbar snap-x snap-mandatory scroll-smooth cursor-grab active:cursor-grabbing"
                >
                    {photos.map((photo, index) => (
                        <PortraitPhotoItem
                            key={photo.id}
                            photo={photo}
                            index={index}
                            searchParams={searchParams}
                            modelName={modelName}
                        />
                    ))}

                    {/* End Spacer to allow final photo to be centered or well-aligned */}
                    <div className="flex-shrink-0 w-20 md:w-32" />
                </div>

                {/* Scroll Indicator line at bottom */}
                <div className="absolute bottom-4 left-6 md:left-0 right-6 md:right-0 h-[1px] bg-neutral-100 overflow-hidden">
                    <motion.div
                        className="h-full bg-neutral-400 w-full origin-left"
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

function PortraitPhotoItem({ photo, index, searchParams, modelName }: {
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
            className="flex-shrink-0 w-[85vw] md:w-[600px] snap-center first:ml-0"
        >
            <Link
                href={`/portfolio?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), img: photo.id }).toString()}`}
                className="block relative aspect-[2/3] md:aspect-[4/5] overflow-hidden rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.1)] group/item bg-neutral-50"
            >
                <Image
                    loader={cloudinaryLoader}
                    src={photo.url}
                    alt={photo.title || modelName}
                    fill
                    className="object-cover transition-transform duration-[2s] ease-out group-hover/item:scale-105"
                    sizes="(max-width: 768px) 85vw, 600px"
                    priority={index < 2}
                />

                {/* Soft Overlay for Hover */}
                <div className="absolute inset-0 bg-neutral-900/10 opacity-0 group-hover/item:opacity-100 transition-opacity duration-700 pointer-events-none" />

                {/* Uploader Mini-icon & Name at Bottom-Right on Hover (Desktop) / Constant (Mobile) */}
                <div className="absolute bottom-0 right-0 left-0 p-6 md:p-8 flex flex-col gap-4 transition-all duration-500 md:translate-y-4 md:opacity-0 group-hover/item:translate-y-0 group-hover/item:opacity-100 z-10">
                    <div className="flex flex-col gap-1.5 flex-1">
                        {/* Camera & Lens Details (EXIF) */}
                        {photo.exif && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 opacity-60 text-[8px] md:text-[9px] uppercase tracking-[0.2em] font-light text-white mb-1">
                                <span className="flex items-center gap-1.5">
                                    <Camera size={10} className="opacity-50" />
                                    {photo.exif.Model}
                                </span>
                                {photo.exif.LensModel && (
                                    <span className="flex items-center gap-1.5">
                                        <Sparkles size={10} className="opacity-50" />
                                        {photo.exif.LensModel}
                                    </span>
                                )}
                            </div>
                        )}

                        <div className="flex items-end justify-between">
                            <div className="flex flex-col">
                                <p className="text-white text-[11px] md:text-sm font-serif tracking-[0.2em] uppercase drop-shadow-md">
                                    {photo.title || "Untitled"}
                                </p>
                                {photo.location && (
                                    <p className="text-white/40 text-[8px] md:text-[9px] uppercase tracking-widest mt-1">
                                        Near {photo.location}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-2 rounded-full border border-white/20 shadow-lg">
                                <span className="text-white text-[9px] md:text-[10px] font-bold tracking-wider leading-none text-white">
                                    {photo.uploaderName || "Creator"}
                                </span>
                                <div className="relative w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden border border-white/40 bg-white/10 shrink-0">
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
                </div>

                {/* Aesthetic Corner Border on Hover */}
                <div className="absolute top-6 right-6 w-8 h-8 border-t border-r border-white/40 opacity-0 group-hover/item:opacity-100 transition-all duration-700 scale-90 group-hover/item:scale-100" />
            </Link>
        </motion.div>
    );
}
