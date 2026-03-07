'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import cloudinaryLoader from "@/lib/cloudinary-loader";

export default function RecentWorksSlider({ photos }: { photos: any[] }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        // add a small pixel tolerance (5px) for floating point rendering
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        // Re-check after images load potentially
        setTimeout(checkScroll, 500);
        return () => window.removeEventListener('resize', checkScroll);
    }, [photos]);

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const scrollAmount = scrollRef.current.clientWidth * 0.8;
        scrollRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });

        // Timeout to check scroll after animation
        setTimeout(checkScroll, 600);
    };

    return (
        <div className="relative group/slider w-full bg-[#0a0a0a] py-20 overflow-hidden shadow-2xl">
            {/* Cinematic top/bottom bars (Letterbox effect for section itself if we want, but gradient is better) */}
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />

            <div className="flex items-center justify-between px-6 md:px-16 mb-12 relative z-20">
                <div className="flex items-center gap-6">
                    <h2 className="text-2xl md:text-4xl font-serif text-white tracking-[0.3em] uppercase">
                        Recent Works
                    </h2>
                    <span className="hidden md:block w-16 h-px bg-white/30"></span>
                    <span className="hidden md:block text-[10px] text-white/40 tracking-widest font-mono uppercase">A collection of stories</span>
                </div>

                <div className="flex items-center gap-3 opacity-0 md:opacity-100 transition-opacity">
                    <button
                        onClick={() => scroll('left')}
                        disabled={!canScrollLeft}
                        className="p-3 rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-all backdrop-blur-md"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        disabled={!canScrollRight}
                        className="p-3 rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-all backdrop-blur-md"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Scroll Track */}
            <div
                ref={scrollRef}
                onScroll={checkScroll}
                className="flex gap-2 md:gap-4 px-6 md:px-16 overflow-x-auto snap-x snap-mandatory scrollbar-hide py-4 relative z-20"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .scrollbar-hide::-webkit-scrollbar { display: none; }
                `}} />

                {photos.map((photo, index) => (
                    <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                        className="snap-center shrink-0 w-[85vw] md:w-[45vw] lg:w-[28vw] xl:w-[22vw] aspect-[3/4] relative group cursor-pointer"
                    >
                        <Link href={`/photo/${photo.id}`} className="block w-full h-full relative overflow-hidden rounded-sm bg-black border border-white/5 transition-transform duration-700 ease-out group-hover:scale-[1.02] shadow-2xl shadow-black/50">
                            <Image
                                loader={cloudinaryLoader}
                                src={photo.url}
                                alt={photo.title || 'Recent Work'}
                                fill
                                className="object-cover transition-all duration-[3s] ease-out group-hover:scale-110 opacity-70 group-hover:opacity-100 sepia-[0.1]"
                                sizes="(max-width: 768px) 85vw, (max-width: 1024px) 45vw, 28vw"
                                priority={index < 4}
                            />

                            {/* Cinematic Overlay targeting film aesthetic */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-6 md:p-8 opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-700">
                                <div className="space-y-3 transform translate-y-6 group-hover:translate-y-0 transition-transform duration-700 ease-out">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center bg-black/40 backdrop-blur-md">
                                            <Play className="w-3.5 h-3.5 text-white/90 ml-0.5" />
                                        </div>
                                        <span className="text-[9px] text-white/50 tracking-[0.4em] font-mono uppercase">Premiere</span>
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-serif text-white tracking-[0.15em] leading-snug line-clamp-2 drop-shadow-lg">
                                        {photo.title || 'Untitled'}
                                    </h3>
                                    <div className="flex items-center gap-4 text-xs text-white/50 tracking-[0.2em] font-light uppercase border-t border-white/10 pt-3 mt-3">
                                        {photo.location && <span>{photo.location}</span>}
                                        {photo.event && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                                <span>{photo.event}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            <div className="flex justify-center mt-16 relative z-20">
                <Link href="/portfolio" className="inline-flex items-center gap-6 text-[10px] md:text-xs tracking-[0.4em] uppercase text-white/50 hover:text-white transition-all duration-500 group">
                    <span>Explore All Works</span>
                    <span className="w-16 h-px bg-white/20 group-hover:bg-white group-hover:w-24 transition-all duration-700"></span>
                </Link>
            </div>
        </div>
    );
}
