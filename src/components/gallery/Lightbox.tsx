"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { X, ChevronLeft, ChevronRight, MapPin, User, Instagram, Twitter, Globe, ExternalLink, Share2, Copy, Check, Facebook } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPhotoStats, incrementPhotoStats, PhotoStats } from "@/lib/worker-stats";
import { Heart, Sparkles, Calendar } from "lucide-react";
import { clsx } from "clsx";
import MapEmbed from "@/app/photo/[id]/MapEmbed";

interface LightboxProps {
    photo: any;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    hasMore?: boolean;
}

const getSnsInfo = (url: string) => {
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
    const [copied, setCopied] = useState(false);
    const [shareConfirmType, setShareConfirmType] = useState<null | 'Twitter' | 'Instagram'>(null);
    const [focalPoint, setFocalPoint] = useState<{ x: number, y: number }>({ x: 50, y: 50 });
    const [stats, setStats] = useState<PhotoStats | null>(null);
    const [isLiked, setIsLiked] = useState(false);

    // Lock body scroll when open
    useEffect(() => {
        document.body.style.overflow = 'hidden';

        // --- 🧠 知識 (Knowledge): Stats 取得 & View インクリメント ---
        if (photo.id) {
            getPhotoStats(photo.id).then(setStats);
            incrementPhotoStats(photo.id, 'view').then(success => {
                if (success) {
                    setStats(prev => prev ? { ...prev, views: prev.views + 1 } : { views: 1, likes: 0 });
                }
            });
        }

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
                        onDragEnd={(_, info) => {
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
                                    {[...Array(6)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{
                                                opacity: [0, 1, 0],
                                                scale: [0, 1, 0],
                                                x: [Math.random() * 100 - 50, Math.random() * 100 - 50],
                                                y: [Math.random() * 100 - 50, Math.random() * 100 - 50]
                                            }}
                                            transition={{
                                                duration: 2 + Math.random() * 2,
                                                repeat: Infinity,
                                                delay: Math.random() * 2
                                            }}
                                            className="absolute"
                                            style={{
                                                left: `${Math.random() * 100}%`,
                                                top: `${Math.random() * 100}%`
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
                            {photo.displayMode === 'character' && photo.title && (
                                <p className="text-sm text-gray-400 font-serif italic">{photo.title}</p>
                            )}

                            {/* --- 🧠 知識 (Knowledge): Stats Display --- */}
                            <div className="flex items-center gap-4 pt-2">
                                <div className="flex items-center gap-1.5 text-gray-400">
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Views</span>
                                    <span className="text-sm font-medium font-sans text-gray-600">{stats?.views || 0}</span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isLiked && photo.id) {
                                            incrementPhotoStats(photo.id, 'like');
                                            setStats(prev => prev ? { ...prev, likes: prev.likes + 1 } : { views: 0, likes: 1 });
                                            setIsLiked(true);
                                        }
                                    }}
                                    disabled={isLiked}
                                    className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-500'}`}
                                >
                                    <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                                    <span className="text-sm font-medium font-sans">{stats?.likes || 0}</span>
                                </button>
                            </div>
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
                                    <div>
                                        <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Location</p>
                                        <p className="text-sm font-medium leading-tight">{photo.location}</p>
                                        {photo.address && (
                                            <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{photo.address}</p>
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

                            {/* Map Display (for photos with location or coordinate data) */}
                            {(photo.location || (photo.latitude && photo.longitude)) && (
                                <div className="pt-2">
                                    <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-2">Location Map</p>
                                    {(photo.latitude && photo.longitude) ? (
                                        <MapEmbed lat={photo.latitude} lng={photo.longitude} />
                                    ) : (
                                        <div className="w-full h-40 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200">
                                            <p className="text-xs text-gray-400 font-bold">地図情報を使用できません</p>
                                        </div>
                                    )}
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
                                <div className="grid grid-cols-3 gap-2">
                                    {/* X (Twitter) Share Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShareConfirmType('Twitter');
                                        }}
                                        className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-black text-white hover:bg-gray-800 transition-all pointer-events-auto"
                                    >
                                        <Twitter size={18} />
                                        <span className="text-[10px] font-bold font-sans">Xでシェア</span>
                                    </button>

                                    {/* Instagram Share Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShareConfirmType('Instagram');
                                        }}
                                        className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white hover:opacity-90 transition-all pointer-events-auto"
                                    >
                                        <Instagram size={18} />
                                        <span className="text-[10px] font-bold font-sans">Instagramへ</span>
                                    </button>

                                    {/* Copy Link Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const url = `${window.location.origin}/photo/${photo.id}`;
                                            navigator.clipboard.writeText(url);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all pointer-events-auto border ${copied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        {copied ? <Check size={18} /> : <Copy size={18} />}
                                        <span className="text-[10px] font-bold font-sans">{copied ? 'コピー済み' : 'リンクをコピー'}</span>
                                    </button>
                                </div>
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
                    onClick={(e) => { e.stopPropagation(); onPrev(); }}
                    className="hidden lg:flex absolute left-8 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full items-center justify-center text-gray-300 hover:text-gray-900 transition-colors"
                >
                    <ChevronLeft size={48} strokeWidth={1} />
                </button>
            )}
            {onNext && (
                <button
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full items-center justify-center text-gray-300 hover:text-gray-900 transition-colors"
                >
                    <ChevronRight size={48} strokeWidth={1} />
                </button>
            )}

            {/* Share Confirmation Dialog */}
            <AnimatePresence>
                {shareConfirmType && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 cursor-default"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShareConfirmType(null);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Banner Preview Area */}
                            <div
                                className="relative aspect-[1.91/1] w-full bg-gray-100 overflow-hidden cursor-crosshair group/banner"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                                    setFocalPoint({ x, y });
                                }}
                            >
                                <Image
                                    src={photo.url}
                                    alt="Share Preview"
                                    fill
                                    className="object-cover transition-transform duration-500"
                                    style={{
                                        objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
                                        transform: 'scale(1.1)'
                                    }}
                                />

                                {/* Focal Point Indicator */}
                                <div
                                    className="absolute w-8 h-8 -ml-4 -mt-4 border-2 border-white/80 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-none transition-all duration-300 ease-out"
                                    style={{ left: `${focalPoint.x}%`, top: `${focalPoint.y}%` }}
                                >
                                    <div className="w-1 h-1 bg-white rounded-full" />
                                    <div className="absolute w-[150%] h-[0.5px] bg-white/50" />
                                    <div className="absolute h-[150%] w-[0.5px] bg-white/50" />
                                </div>

                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                                    <div className="text-white">
                                        <p className="text-[10px] uppercase tracking-widest opacity-70">Banner Preview</p>
                                        <p className="text-sm font-bold truncate">{photo.title || '写真'}</p>
                                    </div>
                                </div>

                                {/* Click to adjust tooltip */}
                                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md px-2 py-1 rounded text-[8px] text-white/80 opacity-0 group-hover/banner:opacity-100 transition-opacity tracking-widest">
                                    タップで位置調整
                                </div>
                            </div>

                            <div className="p-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6 text-blue-500">
                                    <Share2 size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">SNSでかっこよく共有！</h3>
                                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                                    {shareConfirmType === 'Instagram'
                                        ? "URLを自動コピーしてInstagramを開きます。キャプションに貼り付けて共有しましょう！"
                                        : "この写真はSNSで大きなバナーとして共有されます。あなたのフォロワーに最高のクオリティで届けましょう。"
                                    }
                                </p>

                                <div className="mb-8 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-[10px] tracking-widest text-gray-400 font-bold mb-1">切り抜き位置</p>
                                    <p className="text-[11px] text-gray-500">
                                        プレビュー画像をクリックして、共有バナーの中心（顔など）を選択してください。
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => {
                                            const url = `${window.location.origin}/photo/${photo.id}?fp=${focalPoint.x}_${focalPoint.y}`;
                                            const text = `${photo.title || 'Photography'} | DAITAN Portfolio`;
                                            let shareUrl = '';

                                            if (shareConfirmType === 'Twitter') {
                                                shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
                                            } else if (shareConfirmType === 'Instagram') {
                                                // Copy URL to clipboard for Instagram
                                                navigator.clipboard.writeText(url);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                                shareUrl = `https://www.instagram.com/`;
                                            }

                                            window.open(shareUrl, '_blank');
                                            setShareConfirmType(null);
                                        }}
                                        className={`w-full py-4 rounded-xl text-white font-bold transition-all active:scale-[0.98] shadow-lg ${shareConfirmType === 'Twitter'
                                            ? 'bg-black shadow-gray-200'
                                            : 'bg-gradient-to-r from-[#f09433] to-[#bc1888] shadow-orange-100'
                                            }`}
                                    >
                                        {shareConfirmType === 'Instagram' ? 'Instagramを開く' : 'Xでシェアする'}
                                    </button>
                                    <button
                                        onClick={() => setShareConfirmType(null)}
                                        className="w-full py-4 rounded-xl text-gray-400 font-bold hover:bg-gray-50 transition-colors"
                                    >
                                        キャンセル
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
