import Hero from "@/components/ui/Hero";
import PhotoGrid from "@/components/gallery/PhotoGrid";
import { getRecentPhotos } from "@/lib/actions/photos";
import { Suspense } from "react";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
  description: "Gallery of recent works and featured collections.",
};

export default async function Home() {
  const photos = await getRecentPhotos(6);

  // Transform for PhotoGrid if needed (mapping from DB fields to component props)
  const displayPhotos = photos.map(p => ({
    ...p,
    category: p.categoryId, // Mapping categoryId to category prop
    aspectRatio: "portrait" as const, // Defaulting or inferring
  }));

  return (
    <main className="min-h-screen">
      <Hero />

      {/* Recent Works Section */}
      <section className="py-12 md:py-20 px-4 md:px-12 bg-white">
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
