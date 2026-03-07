"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { User, ChevronRight } from "lucide-react";
import { useSearchParams, usePathname } from "next/navigation";

interface Photo {
    id: string;
    url: string;
    title: string;
    category: string;
    subjectName?: string;
    uploaderName?: string;
    uploaderPhotoURL?: string;
}

interface PortraitScrollSectionProps {
    modelName: string;
    photos: Photo[];
}

export default function PortraitScrollSection({ modelName, photos }: PortraitScrollSectionProps) {
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const uploaderPhoto = photos[0]?.uploaderPhotoURL;
    const uploaderName = photos[0]?.uploaderName;

    return (
        <section className="mb-20 last:mb-0">
            {/* Model Header */}
            <div className="flex items-center justify-between mb-6 px-4 md:px-0">
                <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-50 flex-shrink-0 shadow-sm">
                        {uploaderPhoto ? (
                            <img
                                src={uploaderPhoto}
                                alt={uploaderName || modelName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400">
                                <User size={24} />
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-serif tracking-[0.1em] text-neutral-900">
                            {modelName}
                        </h2>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-2 text-neutral-300 text-[10px] uppercase tracking-widest font-bold">
                    Scroll to explore <ChevronRight size={14} className="animate-pulse" />
                </div>
            </div>

            {/* Horizontal Scroll Container */}
            <div className="relative group">
                <div className="flex overflow-x-auto pb-8 gap-4 px-4 md:px-0 no-scrollbar snap-x snap-mandatory scroll-smooth">
                    {photos.map((photo, index) => (
                        <motion.div
                            key={photo.id}
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="flex-shrink-0 w-[280px] md:w-[400px] snap-start"
                        >
                            <Link
                                href={`/portfolio?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), img: photo.id }).toString()}`}
                                className="block relative aspect-[2/3] overflow-hidden rounded-sm shadow-md group/item"
                            >
                                <Image
                                    loader={cloudinaryLoader}
                                    src={photo.url}
                                    alt={photo.title || modelName}
                                    fill
                                    className="object-cover transition-transform duration-[1.5s] ease-out group-hover/item:scale-105"
                                    sizes="(max-width: 768px) 280px, 400px"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                                    <p className="text-white text-xs font-serif tracking-widest uppercase truncate">
                                        {photo.title || 'Untitled'}
                                    </p>
                                </div>
                            </Link>
                        </motion.div>
                    ))}

                    {/* End Spacer */}
                    <div className="flex-shrink-0 w-8 md:w-20" />
                </div>

                {/* Scroll Indicators (Custom Styling) */}
                <style jsx global>{`
                    .no-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .no-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}</style>
            </div>
        </section>
    );
}
