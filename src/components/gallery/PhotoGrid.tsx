"use client";

import React from 'react';
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

export interface Photo {
    id: string;
    url: string;
    title: string;
    category: string;
    location?: string;
    subjectName?: string;
    snsUrl?: string;
    characterName?: string;
    seriesName?: string;
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
        Make?: string;
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

const normalizeDisplayText = (value?: string | null) => value?.trim() || '';

const isUntitledText = (value?: string | null) => {
    const normalized = normalizeDisplayText(value).toLowerCase();
    return !normalized || ['untitled', 'untiled', 'untitle', 'no title', 'no-name', 'noname', '無記名', '名無し'].includes(normalized);
};

const getPhotoDisplayTitle = (photo: Photo) => {
    if (photo.displayMode === 'character' && photo.characterName) {
        return photo.characterName;
    }
    return photo.title;
};

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

    // ギャラリーのページネーション（スクロールで自動読み込み）
    const [visibleCount, setVisibleCount] = React.useState(() => Math.min(12, photos.length));
    const sentinelRef = React.useRef<HTMLDivElement | null>(null);
    React.useEffect(() => {
        setVisibleCount(Math.min(12, photos.length));
    }, [photos.length]);

    React.useEffect(() => {
        if (photos.length <= visibleCount) return;

        const node = sentinelRef.current;
        if (!node) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) {
                setVisibleCount(prev => Math.min(photos.length, prev + 8));
            }
        }, { rootMargin: '240px 0px' });

        observer.observe(node);
        return () => observer.disconnect();
    }, [photos.length, visibleCount]);

    return (
        <div className="relative">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 px-4 md:px-0">
                {photos.slice(0, visibleCount).map((photo, index) => {
                    const displayTitle = getPhotoDisplayTitle(photo);
                    const normalizedTitle = normalizeDisplayText(displayTitle);
                    const shouldShowTitle = !!normalizedTitle && !isUntitledText(normalizedTitle);
                    const camera = normalizeDisplayText(photo.exif?.Model || photo.exif?.Make);
                    const lens = normalizeDisplayText(photo.exif?.LensModel);
                    const location = [photo.location, photo.address].filter(Boolean).join(' / ');
                    const hasMetadata = Boolean(camera || lens || location);

                    return (
                    <div key={photo.id} className="relative">
                        <motion.div
                            className={clsx(
                                "relative group rounded-xl overflow-hidden transition-all duration-300",
                                photo.category?.toLowerCase() === 'cosplay' ? (
                                    "p-[2px] bg-gradient-to-br from-purple-500 via-pink-500 to-amber-500 shadow-lg shadow-purple-500/20"
                                ) : (
                                    "border border-gray-100"
                                )
                            )}
                        >
                            <div className="relative overflow-hidden bg-black" style={{ borderRadius: 12 }}>
                                <Link
                                    href={photo.href || `/portfolio?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), img: photo.id }).toString()}`}
                                    className="block relative overflow-hidden"
                                >
                                    <div className="w-full aspect-square relative">
                                        <Image
                                            loader={cloudinaryLoader}
                                            src={photo.url}
                                            alt={photo.title || (photo.characterName ? `${photo.characterName} - Photo` : "")}
                                            fill
                                            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                                            priority={index < 4}
                                        />
                                    </div>
                                </Link>

                                {photo.category?.toLowerCase() === 'cosplay' && (
                                    <div className="absolute top-3 right-3 z-30 pointer-events-none">
                                        <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-full border border-white/20">
                                            <Sparkles className="w-3.5 h-3.5 text-white fill-amber-300" />
                                        </div>
                                    </div>
                                )}

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-end items-start p-3 pointer-events-none">
                                    <Link
                                        href={`/photo/${photo.id}`}
                                        className="pointer-events-auto p-1.5 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors"
                                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                    >
                                        <Share2 className="w-3 h-3 text-white" />
                                    </Link>
                                </div>
                            </div>
                        </motion.div>

                        <div className="px-2 pt-3 pb-3 flex flex-col gap-1.5 min-h-[2.5rem]">
                            {shouldShowTitle ? (
                                <h3 className="text-[10px] sm:text-[11px] font-serif tracking-[0.08em] text-gray-900 leading-snug break-words">
                                    {normalizedTitle}
                                </h3>
                            ) : (
                                <div className="h-6" />
                            )}
                            {(hasMetadata || shouldShowTitle) && (
                                <div className="flex flex-col gap-1 text-[10px] sm:text-[11px] text-gray-600 leading-relaxed break-words whitespace-normal">
                                    {camera && <p className="break-words">Camera: {camera}</p>}
                                    {lens && <p className="break-words">Lens: {lens}</p>}
                                    {location && <p className="break-words">Location: {location}</p>}
                                </div>
                            )}
                        </div>

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
                    );
                })}
            </div>

            <div ref={sentinelRef} className="h-4" />

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
