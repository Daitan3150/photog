import Hero from "@/components/ui/Hero";
import PhotoGrid from "@/components/gallery/PhotoGrid";
import { getRecentPhotos } from "@/lib/actions/photos";
import { getSiteSettings } from "@/lib/actions/settings";
import { Suspense } from "react";
import HomeFeaturedSection, { HomeRecentWorksHeader, HomeViewAllLink } from "@/components/home/HomeSections";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
  description: "Gallery of recent works and featured collections.",
};

export default async function Home() {
  const photos = await getRecentPhotos(6);
  const settings = await getSiteSettings();

  const displayPhotos = photos.map((p: any) => ({
    ...p,
    category: p.categoryId,
    aspectRatio: "portrait" as const,
  }));

  return (
    <main className="min-h-screen">
      <Hero />

      <HomeFeaturedSection
        portraitCoverUrl={settings.covers.home_portrait}
        snapshotCoverUrl={settings.covers.home_snapshot}
      />

      {/* Recent Works Section */}
      <section className="py-16 md:py-24 px-4 md:px-12 bg-transparent">
        <HomeRecentWorksHeader />

        <Suspense fallback={<div className="text-center py-12"><div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin mx-auto" /></div>}>
          {displayPhotos.length > 0 ? (
            <PhotoGrid photos={displayPhotos as any[]} overlayVariant="category" />
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>No photos found.</p>
            </div>
          )}
        </Suspense>

        <HomeViewAllLink />
      </section>
    </main>
  );
}
