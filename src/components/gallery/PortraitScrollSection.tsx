"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { User, ChevronRight, Camera, Sparkles } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useRef } from "react";
import Lightbox from "./Lightbox";
import type { Photo as GalleryPhoto } from "./PhotoGrid";

type Photo = GalleryPhoto;

interface PortraitScrollSectionProps {
    modelName: string;
    photos: Photo[];
    birthday?: string;
    birthYear?: string;
    birthMonth?: string;
    birthDay?: string;
    approximateAge?: string;
    showBirthYear?: boolean;
    showAge?: boolean;
    ageDisplayMode?: 'blurred' | 'formal';
    deceasedDate?: string;
    deceasedYear?: string;
    deceasedMonth?: string;
    deceasedDay?: string;
    realName?: string;
}

export default function PortraitScrollSection({ 
    modelName, photos, 
    birthday, birthYear, birthMonth, birthDay, approximateAge, showBirthYear, showAge, ageDisplayMode,
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
        <section className="mb-20 last:mb-0 overflow-hidden">
            {/* Model Header - Elegant and Premium */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 px-4 md:px-0 gap-3">
                <div className="relative">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        <span className="text-[9px] md:text-[10px] text-neutral-400 uppercase tracking-[0.45em] block mb-2 font-light">
                            Featured Model
                        </span>
                        <h2 className="text-2xl md:text-3xl font-serif tracking-[0.04em] text-neutral-900 lowercase italic first-letter:uppercase leading-none">
                            {modelName}
                            {realName && realName !== modelName && (
                                <span className="text-sm md:text-[22px] ml-3 font-normal text-neutral-500 italic">
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

                                // 年非公開、かつ年齢非公開ならバッジを出さない
                                if (!showYear && showAge === false) return null;

                                if (ageDisplayMode === 'formal') {
                                    return `${calcAge}歳`;
                                }

                                if (calcAge >= 20) return `${calcAge}↗︎`;
                                return `${calcAge}`;
                            })();

                            const ageBadgeClass = ageDisplayMode === 'formal'
                                ? 'text-amber-700 bg-amber-100/80 border border-amber-200'
                                : 'text-neutral-600 bg-neutral-200/70 border border-neutral-300';

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
                                                        ? 'text-[10px] text-neutral-400 tracking-[0.3em] uppercase font-light'
                                                        : 'text-[18px] md:text-[22px] text-neutral-800 font-black tracking-tight'
                                                }`}>
                                                    {!showYear && (
                                                        <span className="text-[9px] md:text-[10px] text-neutral-300 mr-2 font-light tracking-[0.4em] uppercase">b.</span>
                                                    )}
                                                    {formatB()}
                                                </p>
                                                {ageLabel && (
                                                    <span className={`text-[12px] md:text-[14px] font-bold tracking-widest px-3 py-1.5 rounded-full shadow-sm ${ageBadgeClass}`}>
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
                                        <span className={`text-[13px] md:text-[15px] font-bold tracking-widest px-3 py-1.5 rounded-full shadow-sm ${ageBadgeClass}`}>
                                            {ageLabel}
                                        </span>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                        <div className="w-12 h-[1px] bg-neutral-900 mt-3 opacity-20" />
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
                    <div className="flex-shrink-0 w-16 md:w-24" />
                </div>

                {/* Scroll Indicator line at bottom */}
                <div className="absolute bottom-3 left-4 md:left-0 right-4 md:right-0 h-[1px] bg-neutral-100 overflow-hidden">
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

const getCameraBadgeMeta = (cameraType?: string | null) => {
    switch (cameraType) {
        case 'mirrorless':
            return { label: 'ミラーレス', className: 'border-sky-200/80 bg-sky-100/90 text-sky-700' };
        case 'compact':
            return { label: 'コンパクト', className: 'border-emerald-200/80 bg-emerald-100/90 text-emerald-700' };
        case 'dslr':
            return { label: '一眼', className: 'border-amber-200/80 bg-amber-100/90 text-amber-700' };
        case 'film':
            return { label: 'フィルム', className: 'border-rose-200/80 bg-rose-100/90 text-rose-700' };
        default:
            return null;
    }
};

function PortraitPhotoItem({ photo, index, searchParams, modelName }: {
    photo: Photo,
    index: number,
    searchParams: any,
    modelName: string
}) {
    const cameraBadge = getCameraBadgeMeta(photo.cameraType);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 1, delay: index * 0.05, ease: "easeOut" }}
            className="flex-shrink-0 w-[58vw] md:w-[480px] snap-center first:ml-0"
        >
            <Link
                href={`/portfolio?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), img: photo.id }).toString()}`}
                className="block group/item"
            >
                <div className="relative aspect-[2/3] md:aspect-[4/5] overflow-hidden rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-neutral-50">
                <Image
                    loader={cloudinaryLoader}
                    src={photo.url}
                    alt={photo.title || modelName}
                    fill
                    className="object-cover transition-transform duration-[2s] ease-out group-hover/item:scale-105"
                    sizes="(max-width: 768px) 54vw, 480px"
                />
                {cameraBadge && (
                    <div className="absolute top-4 left-4 z-30 pointer-events-none">
                        <div className={`rounded-full border px-2.5 py-1 text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] backdrop-blur-md ${cameraBadge.className}`}>
                            <span className="flex items-center gap-1">
                                <Camera size={9} />
                                {cameraBadge.label}
                            </span>
                        </div>
                    </div>
                )}
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
                </div>

                <div className="mt-3 px-2 flex justify-center">
                    <p className="text-center text-[11px] sm:text-[12px] md:text-[13px] font-serif tracking-[0.2em] uppercase text-neutral-800 line-clamp-2 leading-relaxed">
                        {photo.title}
                    </p>
                </div>
            </Link>
        </motion.div>
    );
}
