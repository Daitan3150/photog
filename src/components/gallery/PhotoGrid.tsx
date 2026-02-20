"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { getSnsUrl } from "@/lib/utils/sns";
import { Instagram, Twitter, ExternalLink, Globe, Share2 } from "lucide-react";
import Lightbox from "./Lightbox";
import { useState, useEffect } from "react";

// Cloudinary optimization helper
const getOptimizedUrl = (url: string, width: number = 800) => {
    if (!url.includes('res.cloudinary.com')) return url;
    // Add f_auto,q_auto and specific width
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
};

// SNS Service detection helper
const getSnsIcon = (url: string) => {
    if (!url) return null;
    const lower = url.toLowerCase();
    if (lower.includes('instagram.com')) return <Instagram className="w-5 h-5" strokeWidth={1.5} />;
    if (lower.includes('x.com') || lower.includes('twitter.com')) return <Twitter className="w-5 h-5" strokeWidth={1.5} />;
    if (lower.startsWith('http')) return <ExternalLink className="w-5 h-5" strokeWidth={1.5} />;
    return <Globe className="w-5 h-5" strokeWidth={1.5} />;
};

interface Photo {
    id: string;
    url: string;
    title: string;
    category: string;
    location?: string;
    subjectName?: string;
    snsUrl?: string;
    characterName?: string;
    displayMode?: 'title' | 'character';
    aspectRatio?: "portrait" | "landscape" | "square";
    href?: string;
    exif?: {
        Model?: string;
        LensModel?: string;
        FNumber?: number;
        ExposureTime?: number;
        ISO?: number;
        FocalLength?: number;
    };
}

interface PhotoGridProps {
    photos: Photo[];
    overlayVariant?: "metadata" | "category";
}

export default function PhotoGrid({ photos, overlayVariant = "metadata" }: PhotoGridProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const selectedId = searchParams.get('img');

    const selectedPhotoIndex = photos.findIndex(p => p.id === selectedId);
    const selectedPhoto = selectedPhotoIndex !== -1 ? photos[selectedPhotoIndex] : null;

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
        <div className="relative">
            <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4 px-4 md:px-0">
                {photos.map((photo, index) => (
                    <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="break-inside-avoid relative group"
                    >
                        <div className="flex flex-col">
                            <Link href={photo.href || `/portfolio?img=${photo.id}`} className="block overflow-hidden relative rounded-sm shadow-sm">
                                <Image
                                    src={getOptimizedUrl(photo.url, 800)}
                                    alt={photo.title}
                                    width={800}
                                    height={photo.aspectRatio === "portrait" ? 1200 : 600}
                                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    loading="lazy"
                                />

                                {/* Metadata Overlay (Inside Image) */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-5 text-left">
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <div className="flex flex-col gap-1 text-white/90">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    {photo.location && (
                                                        <p className="text-[9px] md:text-[10px] tracking-[0.2em] uppercase opacity-70">
                                                            P. {photo.location}
                                                        </p>
                                                    )}
                                                    {photo.subjectName && (
                                                        <p className="text-[9px] md:text-[10px] tracking-[0.2em] uppercase opacity-70">
                                                            M. {photo.subjectName}
                                                        </p>
                                                    )}
                                                </div>
                                                <Link
                                                    href={`/photo/${photo.id}`}
                                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Share2 className="w-3.5 h-3.5" />
                                                </Link>
                                            </div>

                                            {photo.exif && (
                                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 opacity-60 text-[9px] uppercase tracking-widest font-light">
                                                    <span>{photo.exif.Model}</span>
                                                    <span>{photo.exif.LensModel}</span>
                                                </div>
                                            )}

                                            <h3 className="text-[11px] md:text-sm font-serif tracking-[0.1em] mt-2 border-t border-white/10 pt-2 line-clamp-1">
                                                {photo.displayMode === 'character' && photo.characterName
                                                    ? photo.characterName
                                                    : photo.title}
                                            </h3>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Category Overlay (Only for Category variant) */}
                                <AnimatePresence>
                                    {overlayVariant === "category" && (
                                        <div className="absolute inset-0 bg-black/30 md:bg-black/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-700 flex items-center justify-center overflow-hidden">
                                            <motion.div
                                                initial={{ y: 20, opacity: 0 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 0.8 }}
                                                className="text-center px-4"
                                            >
                                                <motion.div
                                                    animate={{ y: [0, -8, 0] }}
                                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                                >
                                                    <p className="text-white font-serif tracking-[0.6em] text-lg md:text-2xl uppercase border-y border-white/20 py-5 px-6 md:px-12 backdrop-blur-[2px]">
                                                        {photo.category}
                                                    </p>
                                                </motion.div>
                                            </motion.div>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </Link>

                            {/* SNS Icon Below Photo - Refined Margin & Style */}
                            <div className="pt-6 pb-20 flex justify-center">
                                {photo.snsUrl && (
                                    <motion.a
                                        href={getSnsUrl(photo.snsUrl)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        whileHover={{ scale: 1.1, borderColor: "#000", color: "#000", backgroundColor: "#f9fafb" }}
                                        whileTap={{ scale: 0.95 }}
                                        className="w-14 h-14 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 transition-all duration-300 hover:shadow-md"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {getSnsIcon(photo.snsUrl)}
                                    </motion.a>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {selectedPhoto && (
                    <Lightbox
                        photo={selectedPhoto}
                        onClose={closeLightbox}
                        onNext={selectedPhotoIndex < photos.length - 1 ? nextPhoto : undefined}
                        onPrev={selectedPhotoIndex > 0 ? prevPhoto : undefined}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
