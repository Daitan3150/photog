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
                    <div className="break-inside-avoid mb-4">
                        <motion.div
                            className={clsx(
                                "relative group rounded-lg overflow-hidden transition-all duration-300",
                                photo.category?.toLowerCase() === 'cosplay' ? (
                                    "p-[2px] bg-gradient-to-br from-purple-500 via-pink-500 to-amber-500 shadow-lg shadow-purple-500/20"
                                ) : (
                                    "border border-gray-100"
                                )
                            )}
                        >
                            <div className="relative overflow-hidden rounded-md bg-black">
                                <Link
                                    href={photo.href || `/portfolio?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), img: photo.id }).toString()}`}
                                    className="block relative overflow-hidden"
                                >
                                    <Image
                                        loader={cloudinaryLoader}
                                        src={photo.url}
                                        alt={photo.title || (photo.characterName ? `${photo.characterName} - Photo` : "Photo")}
                                        width={800}
                                        height={photo.aspectRatio === "portrait" ? 1200 : 600}
                                        className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        priority={index < 4}
                                    />
                                </Link>

                                {photo.category?.toLowerCase() === 'cosplay' && (
                                    <div className="absolute top-3 right-3 z-30 pointer-events-none">
                                        <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-full border border-white/20">
                                            <Sparkles className="w-3.5 h-3.5 text-white fill-amber-300" />
                                        </div>
                                    </div>
                                )}

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 text-left pointer-events-none">
                                    <div className="pointer-events-auto w-full">
                                        <div className="flex flex-col gap-1 text-white/90">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    {(photo.location || photo.subjectName) && (
                                                        <div className="flex flex-col gap-0.5 mb-1">
                                                            {photo.location && (
                                                                <p className="text-[8px] md:text-[9px] tracking-[0.2em] uppercase opacity-60">
                                                                    LOC. {photo.location}
                                                                </p>
                                                            )}
                                                            {photo.subjectName && (
                                                                <p className="text-[8px] md:text-[9px] tracking-[0.2em] uppercase opacity-60">
                                                                    MDL. {photo.subjectName}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <Link
                                                    href={`/photo/${photo.id}`}
                                                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors"
                                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                                >
                                                    <Share2 className="w-3 h-3 text-white" />
                                                </Link>
                                            </div>

                                            {photo.event && (
                                                <p className="text-[9px] text-amber-300 font-medium tracking-wider flex items-center gap-1">
                                                    <Calendar className="w-2.5 h-2.5" /> {photo.event}
                                                </p>
                                            )}

                                            <div className="flex justify-between items-center mt-1 border-t border-white/10 pt-1.5">
                                                <h3 className="text-[10px] md:text-xs font-serif tracking-[0.05em] line-clamp-1">
                                                    {photo.displayMode === 'character' && photo.characterName
                                                        ? photo.characterName
                                                        : (photo.title || 'Untitled')}
                                                </h3>

                                                {/* Attribution Avatar */}
                                                {(photo.uploaderName || photo.subjectName) && (() => {
                                                    const name = (photo.uploaderName?.includes('@') ? photo.uploaderName.split('@')[0] : photo.uploaderName) || photo.subjectName || 'MEMBER';
                                                    return (
                                                        <div className="relative w-5 h-5 rounded-full overflow-hidden border border-white/30 bg-white/10 shrink-0">
                                                            {photo.uploaderPhotoURL ? (
                                                                <img src={photo.uploaderPhotoURL} alt={name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[7px] font-bold text-white/50">
                                                                    {name.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* SNS Icon Area - Outside the hover box to prevent flickering */}
                        {photo.snsUrl && (
                            <div className="mt-3 flex justify-center items-center h-10">
                                <a
                                    href={getSnsUrl(photo.snsUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-full border border-gray-100 text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all duration-300"
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                >
                                    <div className="scale-75 origin-center">
                                        {getSnsIcon(photo.snsUrl)}
                                    </div>
                                </a>
                            </div>
                        )}
                    </div>
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
