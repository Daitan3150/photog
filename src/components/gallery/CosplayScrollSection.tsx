"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { User, ChevronRight, Sparkles, Calendar } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Lightbox from "./Lightbox";
import type { Photo as GalleryPhoto } from "./PhotoGrid";

type Photo = GalleryPhoto;

interface CosplayScrollSectionProps {
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

export default function CosplayScrollSection({ 
    modelName, photos, 
    birthday, birthYear, birthMonth, birthDay, approximateAge, showBirthYear, showAge, ageDisplayMode,
    deceasedDate, deceasedYear, deceasedMonth, deceasedDay, realName
}: CosplayScrollSectionProps) {
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
        <section className="mb-20 last:mb-0 overflow-hidden">
            {/* Cosplay Header - Purple/Pink Gradient Theme */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 px-4 md:px-0 gap-3">
                <div className="relative">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        <span className="text-[9px] md:text-[10px] text-purple-400 uppercase tracking-[0.45em] block mb-2 font-light flex items-center gap-2">
                            <Sparkles size={12} className="text-amber-400" />
                            Cosplayer
                        </span>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 leading-none">
                            {modelName}
                            {realName && realName !== modelName && (
                                <span className="text-sm md:text-[22px] ml-3 font-medium opacity-80 text-purple-400">
                                    ({realName})
                                </span>
                            )}
                        </h2>

                        {/* 生没年表示 */}
                        {(birthday || deceasedDate || birthMonth || approximateAge) && (() => {
                            const hasDeceased = !!(deceasedDate || deceasedMonth);
                            const showYear = showBirthYear && !!birthYear;

                            // 誕生日フォーマット（年の公開設定に従う）
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

                            // 現在の年齢（または没年齢）を計算
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

                            // 年齢表示文字列（死亡時は「享年」、生存時は年齢 or 20↗︎）
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

                            const deceased = deceasedDate || (deceasedYear && deceasedMonth && deceasedDay);

                            if (hasDeceased) {
                                return (
                                    <div className="mt-3 flex items-center gap-3">
                                        <div className="flex flex-col gap-0.5">
                                            <p className="text-[11px] text-fuchsia-200/60 font-medium tracking-[0.3em] uppercase">
                                                {formatB()}
                                                <span className="mx-2 text-fuchsia-300/30">—</span>
                                                {formatD()}
                                            </p>
                                            {ageLabel && (
                                                <p className="text-[10px] text-fuchsia-200/80 tracking-widest font-black italic mt-0.5">
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
                                                <p className={`font-medium tracking-widest ${
                                                    showYear
                                                        ? 'text-[10px] text-purple-300/70 uppercase'
                                                        : 'text-[16px] md:text-[20px] text-purple-300/80 font-black'
                                                }`}>
                                                    {!showYear && <span className="text-[9px] md:text-[10px] text-purple-300/40 mr-1 font-normal tracking-[0.3em] uppercase">b.</span>}
                                                    {formatB()}
                                                </p>
                                                {ageLabel && (
                                                    <span className={`text-[12px] md:text-[14px] font-black tracking-widest px-3 py-1.5 rounded-full shadow-sm ${ageBadgeClass}`}>
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
                                        <span className={`text-[14px] md:text-[16px] font-black tracking-widest px-3.5 py-1.5 rounded-full shadow-sm ${ageBadgeClass}`}>
                                            {ageLabel}
                                        </span>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* Character / Series Tags */}
                        <div className="flex flex-wrap gap-2 mt-3">
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

                        <div className="w-12 h-[2px] bg-gradient-to-r from-purple-500 to-pink-500 mt-3 rounded-full" />
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
                    className="flex overflow-x-auto pb-12 gap-5 md:gap-7 px-12 md:px-0 no-scrollbar snap-x snap-mandatory scroll-smooth cursor-grab active:cursor-grabbing"
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
                    <div className="flex-shrink-0 w-16 md:w-24" />
                </div>

                {/* Scroll Indicator line - Gradient */}
                <div className="absolute bottom-3 left-4 md:left-0 right-4 md:right-0 h-[2px] bg-purple-50 overflow-hidden rounded-full">
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
            className="flex-shrink-0 w-[50vw] md:w-[420px] snap-center first:ml-0"
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
                        sizes="(max-width: 768px) 50vw, 420px"
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
                                    {photo.title}
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

                <div className="mt-3 flex justify-center px-2">
                    <p className="text-center text-[11px] sm:text-[12px] md:text-[13px] font-serif tracking-[0.2em] uppercase text-neutral-800 line-clamp-2 leading-relaxed">
                        {photo.title}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
