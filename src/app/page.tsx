import Hero from "@/components/ui/Hero";
import PhotoGrid from "@/components/gallery/PhotoGrid";
import { getRecentPhotos } from "@/lib/actions/photos";
import { Suspense } from "react";
import Image from "next/image";
import cloudinaryLoader from "@/lib/cloudinary-loader";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
  description: "Gallery of recent works and featured collections.",
};

export default async function Home() {
  const photos = await getRecentPhotos(6);

  // Transform for PhotoGrid if needed (mapping from DB fields to component props)
  const displayPhotos = photos.map((p: any) => ({
    ...p,
    category: p.categoryId, // Mapping categoryId to category prop
    aspectRatio: "portrait" as const, // Defaulting or inferring
  }));

  return (
    <main className="min-h-screen">
      <Hero />

      {/* Featured Genres Section (Issue 9: 得意ジャンルの明確化) */}
      <section className="py-16 md:py-24 bg-neutral-50 px-4 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 border-b border-black/10 pb-8">
            <h2 className="text-2xl md:text-3xl font-serif mb-3 tracking-wide">Featured Genres</h2>
            <p className="text-gray-500 tracking-[0.2em] text-xs uppercase">得意とする撮影ジャンル</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
            {/* Genre 1: Portrait */}
            <div className="group cursor-pointer">
              <div className="overflow-hidden relative aspect-[4/5] bg-gray-200 mb-6">
                <Image
                  loader={cloudinaryLoader}
                  src="/images/portrait.jpg"
                  alt="Portrait Photography"
                  fill
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
              </div>
              <h3 className="text-2xl font-serif mb-2">Portrait</h3>
              <p className="text-gray-600 font-light leading-relaxed text-sm md:text-base">
                被写体の持つ自然な表情や、その人らしさを引き出すポートレート撮影を得意としています。光と影を巧みに使い、物語を感じさせる一枚を切り取ります。
              </p>
            </div>

            {/* Genre 2: Snapshot */}
            <div className="group cursor-pointer md:mt-16">
              <div className="overflow-hidden relative aspect-[4/5] bg-gray-200 mb-6">
                <Image
                  loader={cloudinaryLoader}
                  src="/images/snapshot.jpg"
                  alt="Snapshot Photography"
                  fill
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
              </div>
              <h3 className="text-2xl font-serif mb-2">Snapshot</h3>
              <p className="text-gray-600 font-light leading-relaxed text-sm md:text-base">
                日常の何気ない瞬間や、街の息遣いを切り取るスナップショット。小樽をはじめとした北海道の風景に溶け込む、ドラマチックな瞬間を追い求めています。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Works Section */}
      <section className="py-16 md:py-24 px-4 md:px-12 bg-white">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-serif mb-4">Recent Works</h2>
          <p className="text-gray-500 tracking-widest text-sm">LATEST PHOTOGRAPHY</p>
        </div>

        <Suspense fallback={<div className="text-center py-12"><div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin mx-auto" /></div>}>
          {displayPhotos.length > 0 ? (
            <PhotoGrid photos={displayPhotos as any[]} overlayVariant="category" />
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>No photos found.</p>
            </div>
          )}
        </Suspense>

        <div className="text-center mt-12">
          <a href="/portfolio" className="inline-block border-b border-black pb-1 hover:text-gray-600 transition-colors tracking-widest">
            VIEW ALL WORKS
          </a>
        </div>
      </section>
    </main>
  );
}
