'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Maximize2 } from 'lucide-react';
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import clsx from 'clsx';

export default function RecentWorksSlider({ photos }: { photos: any[] }) {
    const { t } = useLanguage();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    // Auto-advance
    useEffect(() => {
        if (isHovered || photos.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % photos.length);
        }, 5000); // 5 seconds per slide

        return () => clearInterval(timer);
    }, [photos.length, isHovered]);

    const handlePrevious = useCallback(() => {
        setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    }, [photos.length]);

    const handleNext = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, [photos.length]);

    if (!photos || photos.length === 0) return null;

    const currentPhoto = photos[currentIndex];

    return (
        <div className="relative w-full bg-[#050505] py-16 md:py-24 overflow-hidden border-y border-white/10">
            {/* Cinematic background glow from current image */}
            <div className="absolute inset-0 opacity-20 blur-3xl scale-110 pointer-events-none transition-all duration-[2s]">
                <Image
                    loader={cloudinaryLoader}
                    src={currentPhoto.url}
                    alt="glow"
                    fill
                    className="object-cover"
                />
            </div>

            {/* Top and Bottom cinematic letterboxing bars (soft) */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#050505] to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent z-10 pointer-events-none" />

            <div className="max-w-[1400px] mx-auto px-4 md:px-12 relative z-20">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 md:mb-12">
                    <div className="flex items-center gap-4 md:gap-8">
                        <h2 className="text-2xl md:text-5xl font-serif text-white tracking-[0.2em] md:tracking-[0.3em] uppercase drop-shadow-lg">
                            {t.home.recentWorks}
                        </h2>
                        <span className="hidden md:block w-24 h-px bg-gradient-to-r from-white/50 to-transparent"></span>
                        <span className="hidden md:block text-xs text-white/40 tracking-[0.5em] font-mono uppercase bg-black/40 px-3 py-1 rounded-full border border-white/10">
                            {t.home.recentWorksSub || 'Premiere Exhibition'}
                        </span>
                    </div>

                    {/* Navigation Buttons (Desktop) */}
                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={handlePrevious}
                            className="p-4 rounded-full border border-white/20 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/40 transition-all backdrop-blur-md group"
                        >
                            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={handleNext}
                            className="p-4 rounded-full border border-white/20 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/40 transition-all backdrop-blur-md group"
                        >
                            <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Main Featured Frame */}
                <div
                    className="relative w-full max-w-6xl mx-auto aspect-[4/5] md:aspect-[21/9] lg:aspect-[2.35/1] xl:aspect-[2.35/1] rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden bg-black group"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.2, ease: "easeInOut" }}
                            className="absolute inset-0"
                        >
                            {/* Inner Picture Frame (Passepartout effect) */}
                            <div className="absolute inset-4 md:inset-8 z-20 pointer-events-none rounded border border-white/5 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]" />

                            <Image
                                loader={cloudinaryLoader}
                                src={currentPhoto.url}
                                alt={currentPhoto.title || 'Featured Work'}
                                fill
                                className={clsx(
                                    "object-contain md:object-cover transition-transform duration-[20s] ease-linear",
                                    currentPhoto.aspectRatio === 'portrait' ? "md:object-contain bg-[#0a0a0a]" : "md:object-cover"
                                )}
                                sizes="(max-width: 768px) 100vw, 1400px"
                                priority
                            />

                            {/* Film Grain overlay */}
                            <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay z-10 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>

                            {/* Gradient Overlay for Text Visibility */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-20 pointer-events-none md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-700" />

                            {/* Info Overlay inside the frame */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-30 translate-y-4 md:translate-y-12 md:group-hover:translate-y-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-700 ease-out flex flex-col items-start pointer-events-none">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-white/40 flex items-center justify-center bg-black/60 backdrop-blur-md">
                                        <Play className="w-3 h-3 md:w-3.5 md:h-3.5 text-white/90 ml-0.5" />
                                    </div>
                                    <span className="text-[10px] md:text-sm text-white/70 tracking-[0.5em] font-mono uppercase bg-black/50 px-3 py-1 rounded backdrop-blur-sm border border-white/10">EXHIBITION 0{currentIndex + 1}</span>
                                </div>
                                <h3 className="text-2xl md:text-5xl font-serif text-white tracking-[0.1em] drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] mb-4">
                                    {currentPhoto.title || 'Untitled Masterpiece'}
                                </h3>

                                <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-white/70 tracking-[0.2em] font-light uppercase">
                                    {currentPhoto.location && <span className="bg-black/50 px-3 py-1.5 rounded backdrop-blur-sm border border-white/5">{currentPhoto.location}</span>}
                                    {currentPhoto.event && <span className="bg-black/50 px-3 py-1.5 rounded backdrop-blur-sm border border-white/5">{currentPhoto.event}</span>}
                                </div>

                                {/* Uploader / Model Attribution */}
                                {(currentPhoto.subjectName || currentPhoto.uploaderName) && (() => {
                                    const uploaderLabel = currentPhoto.uploaderName?.includes('@')
                                        ? currentPhoto.uploaderName.split('@')[0]
                                        : currentPhoto.uploaderName;
                                    const displayAttributionName = currentPhoto.subjectName || uploaderLabel || 'Member';
                                    const initial = displayAttributionName.charAt(0).toUpperCase();

                                    return (
                                        <div className="mt-6 flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md pointer-events-auto">
                                            <div className="relative w-6 h-6 md:w-8 md:h-8 rounded-full overflow-hidden border border-white/40 bg-white/20">
                                                {currentPhoto.uploaderPhotoURL && !currentPhoto.subjectName ? (
                                                    <img
                                                        src={currentPhoto.uploaderPhotoURL}
                                                        alt={displayAttributionName}
                                                        className="w-full h-auto object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] md:text-xs font-bold text-white/70">
                                                        {initial}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] md:text-[10px] text-white/40 tracking-[0.3em] uppercase">{currentPhoto.subjectName ? 'Model' : 'Photographer'}</span>
                                                <span className="text-xs md:text-sm font-bold text-white/90 tracking-widest">{displayAttributionName}</span>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <Link
                                    href={`/photo/${currentPhoto.id}`}
                                    className="mt-8 pointer-events-auto flex items-center gap-3 text-xs tracking-[0.3em] text-white hover:text-amber-300 uppercase group/btn bg-white/10 hover:bg-white/20 px-6 py-3 rounded-sm backdrop-blur border border-white/20 transition-all"
                                >
                                    <Maximize2 className="w-4 h-4" />
                                    <span>View Details</span>
                                </Link>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-30">
                        <motion.div
                            key={`progress-${currentIndex}`}
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 5, ease: "linear" }}
                            className="h-full bg-white/60"
                        />
                    </div>
                </div>

                {/* Mobile Navigation & Slide Counter */}
                <div className="flex items-center justify-between mt-6 md:hidden">
                    <button onClick={handlePrevious} className="p-3 border border-white/20 text-white"><ChevronLeft size={20} /></button>
                    <div className="flex gap-2">
                        {photos.map((_, idx) => (
                            <div key={idx} className={clsx(
                                "h-1 rounded-full transition-all duration-500",
                                idx === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"
                            )}></div>
                        ))}
                    </div>
                    <button onClick={handleNext} className="p-3 border border-white/20 text-white"><ChevronRight size={20} /></button>
                </div>

                {/* Desktop Thumbnail indicators */}
                <div className="hidden md:flex justify-center gap-3 mt-8">
                    {photos.map((photo, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={clsx(
                                "relative w-24 h-16 rounded overflow-hidden border transition-all duration-300",
                                idx === currentIndex ? "border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "border-white/20 opacity-40 hover:opacity-100 hover:border-white/50"
                            )}
                        >
                            <Image
                                loader={cloudinaryLoader}
                                src={photo.url}
                                alt={`thumb-${idx}`}
                                fill
                                className="object-cover"
                                sizes="96px"
                            />
                        </button>
                    ))}
                </div>

                <div className="flex justify-center mt-12 md:mt-16">
                    <Link href="/portfolio" className="inline-flex items-center gap-6 text-[10px] md:text-xs tracking-[0.4em] uppercase text-white/50 hover:text-white transition-all duration-500 group border border-white/10 px-8 py-4 rounded-full hover:bg-white/5 backdrop-blur-sm">
                        <span>{t.home.viewAllWorks}</span>
                        <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
