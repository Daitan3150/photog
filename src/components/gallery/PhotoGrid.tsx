"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { getSnsUrl } from "@/lib/utils/sns";
import { Instagram, Twitter, ExternalLink, Globe, Share2, Calendar, Sparkles } from "lucide-react";
import Lightbox from "./Lightbox";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { clsx } from "clsx";

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
    event?: string;
    displayMode?: 'title' | 'character';
    aspectRatio?: "portrait" | "landscape" | "square";
    latitude?: number;
    longitude?: number;
    address?: string;
    href?: string;
    uploaderName?: string;
    uploaderPhotoURL?: string;
    exif?: {
        Model?: string;
        LensModel?: string;
        FNumber?: number;
        ExposureTime?: number;
        ISO?: number;
        FocalLength?: number;
    };
    nextPhotoUrl?: string | null;
    prevPhotoUrl?: string | null;
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
    let selectedPhoto = selectedPhotoIndex !== -1 ? photos[selectedPhotoIndex] : null;

    // ✅ プリフェッチ用に隣接写真のURLを追加 (安全なアクセス)
    if (selectedPhoto && Array.isArray(photos)) {
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
        <div className="relative">
            <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4 px-4 md:px-0">
                {photos.map((photo, index) => (
                    <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className={clsx(
                            "break-inside-avoid relative group mb-4",
                            photo.category?.toLowerCase() === 'cosplay' && "p-[2px] rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-amber-500 shadow-lg shadow-purple-200/50"
                        )}
                    >
                        <div className="flex flex-col">
                            <div className="relative overflow-hidden rounded-sm shadow-sm group">
                                <Link
                                    href={photo.href || `/portfolio?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), img: photo.id }).toString()}`}
                                    className="block"
                                >
                                    <Image
                                        loader={cloudinaryLoader}
                                        src={photo.url}
                                        alt={photo.title || (photo.characterName ? `${photo.characterName} - Photo` : "Photo")}
                                        width={800}
                                        height={photo.aspectRatio === "portrait" ? 1200 : 600}
                                        className="w-full h-auto object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        priority={index < 4}
                                    />
                                </Link>

                                {photo.category?.toLowerCase() === 'cosplay' && (
                                    <div className="absolute top-3 right-3 z-10 pointer-events-none">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                            className="bg-white/20 backdrop-blur-md p-1.5 rounded-full border border-white/40"
                                        >
                                            <Sparkles className="w-4 h-4 text-white fill-amber-300" />
                                        </motion.div>
                                    </div>
                                )}

                                {/* Metadata Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-500 pointer-events-none flex flex-col justify-end p-5 text-left">
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5 }}
                                        className="pointer-events-auto"
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
                                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                                >
                                                    <Share2 className="w-3.5 h-3.5" />
                                                </Link>
                                            </div>

                                            {photo.event && (
                                                <p className="text-[10px] text-amber-300 font-medium tracking-wider flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" /> {photo.event}
                                                </p>
                                            )}

                                            {photo.exif && (
                                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 opacity-60 text-[9px] uppercase tracking-widest font-light">
                                                    <span>{photo.exif.Model}</span>
                                                    <span>{photo.exif.LensModel}</span>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center mt-2 border-t border-white/10 pt-2 pb-1">
                                                <h3 className="text-[11px] md:text-sm font-serif tracking-[0.1em] line-clamp-1">
                                                    {photo.displayMode === 'character' && photo.characterName
                                                        ? photo.characterName
                                                        : (photo.title || '無題')}
                                                </h3>

                                                {/* Uploader / Model Attribution */}
                                                {(photo.uploaderName || photo.subjectName) && (() => {
                                                    const uploaderLabel = photo.uploaderName?.includes('@')
                                                        ? photo.uploaderName.split('@')[0]
                                                        : photo.uploaderName;

                                                    const displayAttributionName = uploaderLabel || photo.subjectName || 'Member';
                                                    const initial = displayAttributionName.charAt(0).toUpperCase();

                                                    return (
                                                        <div className="flex items-center gap-1.5 ml-2 shrink-0 group/uploader" title={`Creator: ${photo.uploaderName || displayAttributionName}`}>
                                                            <div className="relative w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden border border-white/40 bg-white/20">
                                                                {photo.uploaderPhotoURL ? (
                                                                    <img
                                                                        src={photo.uploaderPhotoURL}
                                                                        alt={photo.uploaderName || displayAttributionName}
                                                                        className="w-full h-auto object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white/70">
                                                                        {initial}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-[8px] md:text-[9px] font-bold opacity-0 group-hover/uploader:opacity-100 transition-opacity whitespace-nowrap hidden md:inline">
                                                                {displayAttributionName}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Category Overlay */}
                                <AnimatePresence>
                                    {overlayVariant === "category" && (
                                        <div className="absolute inset-0 bg-black/30 md:bg-black/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-700 flex items-center justify-center overflow-hidden pointer-events-none">
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
                            </div>

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
                                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
