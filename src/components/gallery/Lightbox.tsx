"use client";

import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import Image from "next/image";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { X, ChevronLeft, ChevronRight, MapPin, User, Instagram, Twitter, Globe, ExternalLink, Share2, Copy, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Sparkles, Calendar } from "lucide-react";
import { clsx } from "clsx";
import LeafletMap from "@/components/common/LeafletMap";
import PhotoStatsActions from "./PhotoStatsActions";

interface LightboxProps {
    photo: LightboxPhoto;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    hasMore?: boolean;
}

interface LightboxPhoto {
    id?: string;
    url: string;
    title?: string;
    category?: string;
    categoryId?: string;
    subjectName?: string;
    snsUrl?: string;
    characterName?: string;
    seriesName?: string;
    event?: string;
    displayMode?: 'title' | 'character';
    location?: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    nextPhotoUrl?: string | null;
    prevPhotoUrl?: string | null;
    exif?: {
        Make?: string;
        Model?: string;
        LensModel?: string;
        FNumber?: number;
        ExposureTime?: number | string;
        ISO?: number;
        FocalLength?: number;
    };
}

const getSnsInfo = (url?: string) => {
    if (!url) return { icon: null, label: 'SNS' };
    const lower = url.toLowerCase();
    if (lower.includes('instagram.com')) {
        return { icon: <Instagram size={18} strokeWidth={1.5} />, label: 'Instagram' };
    }
    if (lower.includes('x.com') || lower.includes('twitter.com')) {
        return { icon: <Twitter size={18} strokeWidth={1.5} />, label: 'X（旧Twitter）' };
    }
    if (lower.startsWith('http')) {
        return { icon: <ExternalLink size={18} strokeWidth={1.5} />, label: 'Link' };
    }
    return { icon: <Globe size={18} strokeWidth={1.5} />, label: 'SNS' };
};

import { formatShutterSpeed } from "@/lib/utils/exif";

export default function Lightbox({ photo, onClose, onNext, onPrev }: LightboxProps) {
    const { icon: snsIcon, label: snsLabel } = getSnsInfo(photo.snsUrl);
    const coordinates = typeof photo.latitude === 'number' && typeof photo.longitude === 'number'
        ? { lat: photo.latitude, lng: photo.longitude }
        : null;
    const [copied, setCopied] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const shareUrl = typeof window !== 'undefined' && photo.id
        ? `${window.location.origin}/photo/${photo.id}`
        : '';
    const sparkleItems = useMemo(() => {
        const seedText = String(photo.id || photo.url || 'photo');
        const seed = Array.from(seedText).reduce((sum, char) => sum + char.charCodeAt(0), 0);
        const pseudo = (index: number) => {
            const value = Math.sin(seed + index * 999) * 10000;
            return value - Math.floor(value);
        };

        return Array.from({ length: 6 }, (_, index) => ({
            left: pseudo(index * 7) * 100,
            top: pseudo(index * 7 + 1) * 100,
            xFrom: pseudo(index * 7 + 2) * 100 - 50,
            xTo: pseudo(index * 7 + 3) * 100 - 50,
            yFrom: pseudo(index * 7 + 4) * 100 - 50,
            yTo: pseudo(index * 7 + 5) * 100 - 50,
            duration: 2 + pseudo(index * 7 + 6) * 2,
            delay: pseudo(index * 7 + 7) * 2,
        }));
    }, [photo.id, photo.url]);

    // Lock body scroll when open
    useEffect(() => {
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [photo.id]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight' && onNext) onNext();
            if (e.key === 'ArrowLeft' && onPrev) onPrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onNext, onPrev]);

    if (!photo) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-xl flex flex-col items-center md:justify-center pt-24 pb-10 px-4 md:px-10 overflow-y-auto"
            onClick={onClose}
        >
            {/* Close Button */}
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="fixed top-6 right-6 md:top-10 md:right-10 text-gray-900 hover:scale-110 transition-transform p-3 bg-white/80 md:bg-gray-100/50 rounded-full z-[110] shadow-sm md:shadow-none border border-gray-100 md:border-none"
                aria-label="Close"
            >
                <X size={32} strokeWidth={1.5} />
            </button>

            {/* Main Content Area */}
            <div className="relative w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-10 items-center justify-center pointer-events-none mb-10 md:mb-0">

                {/* Image Container */}
                <div
                    className="relative w-full h-[50vh] min-h-[300px] md:h-full md:flex-grow pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="relative w-full h-full cursor-grab active:cursor-grabbing"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
                            const threshold = 50;
                            if (info.offset.x < -threshold && onNext) {
                                onNext();
                            } else if (info.offset.x > threshold && onPrev) {
                                onPrev();
                            }
                        }}
                    >
                        <div className={clsx(
                            "relative w-full h-full p-1 md:p-2",
                            (photo.category?.toLowerCase() === 'cosplay' || photo.categoryId?.toLowerCase() === 'cosplay') && "bg-gradient-to-br from-purple-500 via-pink-500 to-amber-500 rounded-2xl shadow-2xl shadow-purple-500/20"
                        )}>
                            <Image
                                loader={cloudinaryLoader}
                                src={photo.url}
                                alt={photo.title || "Photography"}
                                fill
                                className={clsx(
                                    "object-contain pointer-events-none transition-all duration-500",
                                    (photo.category?.toLowerCase() === 'cosplay' || photo.categoryId?.toLowerCase() === 'cosplay') && "rounded-xl"
                                )}
                                priority
                                sizes="(max-width: 768px) 100vw, 85vw"
                                placeholder="blur"
                                blurDataURL={cloudinaryLoader({ src: photo.url, width: 50, quality: 10 })}
                            />

                            {/* Cosplay Sparkle Layer */}
                            {(photo.category?.toLowerCase() === 'cosplay' || photo.categoryId?.toLowerCase() === 'cosplay') && (
                                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                                    {sparkleItems.map((sparkle, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{
                                                opacity: [0, 1, 0],
                                                scale: [0, 1, 0],
                                                x: [sparkle.xFrom, sparkle.xTo],
                                                y: [sparkle.yFrom, sparkle.yTo]
                                            }}
                                            transition={{
                                                duration: sparkle.duration,
                                                repeat: Infinity,
                                                delay: sparkle.delay
                                            }}
                                            className="absolute"
                                            style={{
                                                left: `${sparkle.left}%`,
                                                top: `${sparkle.top}%`
                                            }}
                                        >
                                            <Sparkles className="w-6 h-6 text-white/40 drop-shadow-glow" />
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Sidebar / Info */}
                <div
                    className="w-full md:w-80 flex flex-col gap-8 pointer-events-auto text-left bg-white/50 p-6 rounded-2xl md:bg-transparent md:p-0"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <span className="text-[10px] tracking-[0.4em] text-gray-400 uppercase font-bold">Photo Title</span>
                            <h2 className="text-3xl md:text-4xl font-serif text-gray-900 leading-tight">
                                {photo.displayMode === 'character' && photo.characterName
                                    ? photo.characterName
                                    : photo.title}
                            </h2>
                            {photo.displayMode === 'character' && (
                                <div className="flex flex-col gap-1">
                                    {photo.seriesName && (
                                        <p className="text-[10px] text-pink-600 font-black tracking-[0.2em] uppercase">{photo.seriesName}</p>
                                    )}
                                    {photo.title && (
                                        <p className="text-sm text-gray-400 font-serif italic">{photo.title}</p>
                                    )}
                                </div>
                            )}
                            {photo.displayMode !== 'character' && (photo.characterName || photo.seriesName) && (
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 font-bold">
                                    {photo.characterName && (
                                        <span className="flex items-center gap-1">
                                            <User size={10} className="text-pink-400" />
                                            {photo.characterName}
                                        </span>
                                    )}
                                    {photo.seriesName && (
                                        <span className="opacity-70">
                                            # {photo.seriesName}
                                        </span>
                                    )}
                                </div>
                            )}

                            {photo.id && (
                                <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                                    <PhotoStatsActions photoId={photo.id} trackView={true} variant="light" />
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t border-gray-100 space-y-4">
                            {photo.subjectName && (
                                <div className="flex items-center gap-3 text-gray-600">
                                    <div className={clsx(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                                        (photo.category?.toLowerCase() === 'cosplay' || photo.categoryId?.toLowerCase() === 'cosplay') ? "bg-purple-100 text-purple-600" : "bg-gray-50 text-gray-400"
                                    )}>
                                        <User size={14} className={(photo.category?.toLowerCase() === 'cosplay' || photo.categoryId?.toLowerCase() === 'cosplay') ? "" : "opacity-50"} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">
                                            {(photo.category?.toLowerCase() === 'cosplay' || photo.categoryId?.toLowerCase() === 'cosplay') ? 'Cosplayer' : 'Model'}
                                        </p>
                                        <p className={clsx(
                                            "text-sm font-medium",
                                            (photo.category?.toLowerCase() === 'cosplay' || photo.categoryId?.toLowerCase() === 'cosplay') && "text-purple-900"
                                        )}>{photo.subjectName}</p>
                                    </div>
                                </div>
                            )}

                            {/* Cosplay Event Name Display */}
                            {(photo.category?.toLowerCase() === 'cosplay' || photo.categoryId?.toLowerCase() === 'cosplay') && photo.event && (
                                <div className="flex items-center gap-3 text-gray-600">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                        <Calendar size={14} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Event</p>
                                        <p className="text-sm font-bold text-amber-700 tracking-wide">{photo.event}</p>
                                    </div>
                                </div>
                            )}
                            {photo.location && (
                                <div className="flex items-center gap-3 text-gray-600">
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                                        <MapPin size={14} className="opacity-50" />
                                    </div>
                                    <div className="flex flex-col items-start gap-1 flex-1">
                                        <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Location</p>
                                        {(photo.latitude && photo.longitude) || (photo.location || photo.address) ? (
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                                    [photo.location, photo.address].filter(Boolean).join(' ') ||
                                                    (photo.latitude && photo.longitude ? `${photo.latitude},${photo.longitude}` : '')
                                                )}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:text-blue-600 transition-colors flex flex-col items-start group/loc"
                                                title="Google Mapsで開く"
                                            >
                                                <span className="text-sm font-medium leading-tight underline decoration-gray-300 underline-offset-4 group-hover/loc:decoration-blue-400">{photo.location}</span>
                                                {photo.address && (
                                                    <span className="text-[10px] text-gray-400 mt-1 leading-snug">{photo.address}</span>
                                                )}
                                            </a>
                                        ) : (
                                            <>
                                                <p className="text-sm font-medium leading-tight">{photo.location || 'Unknown Location'}</p>
                                                {photo.address && (
                                                    <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{photo.address}</p>
                                                )}
                                            </>
                                        )}

                                        {/* ✅ ライトボックス内マッププレビュー (Leaflet) */}
                                        {coordinates && (
                                            <div className="w-full h-32 mt-2 group/map relative">
                                                <LeafletMap
                                                    lat={coordinates.lat}
                                                    lng={coordinates.lng}
                                                    height="128px"
                                                    className="rounded-xl overflow-hidden shadow-sm border border-gray-100"
                                                />
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="absolute top-2 right-2 z-[1000] bg-white/95 backdrop-blur-md p-1.5 rounded-lg text-blue-600 shadow-sm border border-blue-100 hover:bg-blue-50 transition-all transform scale-75 lg:scale-90"
                                                    title="Google Maps"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-gray-600">
                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-[10px] font-bold">
                                    #
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Category</p>
                                    <p className="text-sm font-medium uppercase">{photo.category}</p>
                                </div>
                            </div>

                            {/* EXIF Data Display */}
                            {photo.exif && (
                                <div className="pt-6 border-t border-gray-100 space-y-3">
                                    <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Shooting Data</p>
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                        {(photo.exif.Model || photo.exif.Make) && (
                                            <div className="col-span-2">
                                                <p className="text-[8px] text-gray-400 uppercase tracking-tighter">Camera</p>
                                                <p className="text-[11px] font-medium leading-tight">
                                                    {photo.exif.Model || photo.exif.Make}
                                                </p>
                                            </div>
                                        )}
                                        {photo.exif.LensModel && (
                                            <div className="col-span-2">
                                                <p className="text-[8px] text-gray-400 uppercase tracking-tighter">Lens</p>
                                                <p className="text-[11px] font-medium leading-tight">{photo.exif.LensModel}</p>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 col-span-2 gap-4">
                                            {photo.exif.FNumber && (
                                                <div>
                                                    <p className="text-[8px] text-gray-400 uppercase tracking-tighter">Aperture</p>
                                                    <p className="text-[11px] font-medium">f/{photo.exif.FNumber}</p>
                                                </div>
                                            )}
                                            {photo.exif.ExposureTime && (
                                                <div>
                                                    <p className="text-[8px] text-gray-400 uppercase tracking-tighter">Shutter</p>
                                                    <p className="text-[11px] font-medium">{formatShutterSpeed(photo.exif.ExposureTime)}</p>
                                                </div>
                                            )}
                                            {photo.exif.ISO && (
                                                <div>
                                                    <p className="text-[8px] text-gray-400 uppercase tracking-tighter">ISO</p>
                                                    <p className="text-[11px] font-medium">{photo.exif.ISO}</p>
                                                </div>
                                            )}
                                            {photo.exif.FocalLength && (
                                                <div>
                                                    <p className="text-[8px] text-gray-400 uppercase tracking-tighter">Focal</p>
                                                    <p className="text-[11px] font-medium">{Math.round(photo.exif.FocalLength)}mm</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}


                            {photo.snsUrl && (
                                <div className="flex items-center gap-3 text-gray-600 pt-4 border-t border-gray-100">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                                        {snsIcon}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">SNS</p>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={photo.snsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1.5 group font-sans"
                                            >
                                                <span>{snsLabel}</span>
                                                <ExternalLink size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SNS共有セクション */}
                            <div className="pt-8 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-gray-900 font-bold">この写真をシェア</p>
                                    <div className="h-[1px] flex-1 bg-gray-100 ml-4" />
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsShareOpen(true);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-900 text-white hover:bg-black transition-all pointer-events-auto"
                                >
                                    <Share2 size={18} />
                                    <span className="text-[10px] font-bold font-sans">SNSに共有する</span>
                                </button>
                            </div>
                        </div>

                        {/* Navigation Controls Contextual */}
                        <div className="flex items-center gap-4 mt-auto pt-10">
                            {onPrev && (
                                <button
                                    onClick={onPrev}
                                    className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 hover:border-gray-900 transition-all text-gray-400 hover:text-gray-900"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                            )}
                            {onNext && (
                                <button
                                    onClick={onNext}
                                    className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 hover:border-gray-900 transition-all text-gray-400 hover:text-gray-900 font-medium"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Overlay Controls (For larger screens) */}
            {onPrev && (
                <button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); onPrev(); }}
                    className="hidden lg:flex absolute left-8 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full items-center justify-center text-gray-300 hover:text-gray-900 transition-colors"
                >
                    <ChevronLeft size={48} strokeWidth={1} />
                </button>
            )}
            {onNext && (
                <button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); onNext(); }}
                    className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full items-center justify-center text-gray-300 hover:text-gray-900 transition-colors"
                >
                    <ChevronRight size={48} strokeWidth={1} />
                </button>
            )}

            {/* Share URL Dialog */}
            <AnimatePresence>
                {isShareOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 cursor-default"
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setIsShareOpen(false);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-md"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6 text-blue-500">
                                    <Share2 size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">共有用URL</h3>
                                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                                    下のURLをコピーして、SNSの投稿文に貼ってください。
                                </p>

                                <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-3 text-left">
                                    <p className="text-[10px] tracking-widest text-gray-400 font-bold mb-2">URL</p>
                                    <p className="text-sm text-gray-700 break-all font-mono">{shareUrl || '読み込み中...'}</p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => {
                                            if (!shareUrl) return;
                                            navigator.clipboard.writeText(shareUrl);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className="w-full py-4 rounded-xl bg-gray-900 text-white font-bold transition-all active:scale-[0.98]"
                                    >
                                        {copied ? 'コピーしました' : 'URLをコピー'}
                                    </button>
                                    <button
                                        onClick={() => setIsShareOpen(false)}
                                        className="w-full py-4 rounded-xl text-gray-400 font-bold hover:bg-gray-50 transition-colors"
                                    >
                                        閉じる
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ✅ プリフェッチ (こっっそり次・前の写真を読み込む) */}
            <div className="hidden">
                {onNext && photo.nextPhotoUrl && (
                    <Image loader={cloudinaryLoader} src={photo.nextPhotoUrl} alt="prefetch" width={800} height={1200} priority={false} />
                )}
                {onPrev && photo.prevPhotoUrl && (
                    <Image loader={cloudinaryLoader} src={photo.prevPhotoUrl} alt="prefetch" width={800} height={1200} priority={false} />
                )}
            </div>
        </motion.div>
    );
}
