"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import Image from "next/image";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import Link from "next/link";

interface HomeFeaturedSectionProps {
    portraitCoverUrl: string;
    snapshotCoverUrl: string;
}

export default function HomeFeaturedSection({ portraitCoverUrl, snapshotCoverUrl }: HomeFeaturedSectionProps) {
    const { t } = useLanguage();

    return (
        <>
            {/* Featured Genres Section */}
            <section className="py-16 md:py-24 bg-neutral-50 px-4 md:px-12">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12 border-b border-black/10 pb-8">
                        <h2 className="text-2xl md:text-3xl font-serif mb-3 tracking-wide">{t.home.featuredGenres}</h2>
                        <p className="text-gray-500 tracking-[0.2em] text-xs uppercase">{t.home.featuredGenresSub}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
                        {/* Genre 1: Portrait */}
                        <div className="group cursor-pointer">
                            <div className="overflow-hidden relative aspect-[4/5] bg-gray-200 mb-6">
                                <Image
                                    loader={cloudinaryLoader}
                                    src={portraitCoverUrl || "/images/portrait.jpg"}
                                    alt="Portrait Photography"
                                    fill
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                />
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                            </div>
                            <h3 className="text-2xl font-serif mb-2">{t.home.portraitTitle}</h3>
                            <p className="text-gray-600 font-light leading-relaxed text-sm md:text-base">
                                {t.home.portraitDesc}
                            </p>
                        </div>

                        {/* Genre 2: Snapshot */}
                        <div className="group cursor-pointer md:mt-16">
                            <div className="overflow-hidden relative aspect-[4/5] bg-gray-200 mb-6">
                                <Image
                                    loader={cloudinaryLoader}
                                    src={snapshotCoverUrl || "/images/snapshot.jpg"}
                                    alt="Snapshot Photography"
                                    fill
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                />
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                            </div>
                            <h3 className="text-2xl font-serif mb-2">{t.home.snapshotTitle}</h3>
                            <p className="text-gray-600 font-light leading-relaxed text-sm md:text-base">
                                {t.home.snapshotDesc}
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

interface HomeRecentWorksSectionProps {
    viewAllLabel: string;
}

export function HomeRecentWorksHeader() {
    const { t } = useLanguage();
    return (
        <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-serif mb-4">{t.home.recentWorks}</h2>
            <p className="text-gray-500 tracking-widest text-sm uppercase">{t.home.recentWorksSub}</p>
        </div>
    );
}

export function HomeViewAllLink() {
    const { t } = useLanguage();
    return (
        <div className="text-center mt-12">
            <Link href="/portfolio" className="inline-block border-b border-black pb-1 hover:text-gray-600 transition-colors tracking-widest">
                {t.home.viewAllWorks}
            </Link>
        </div>
    );
}
