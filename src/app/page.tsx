import Hero from "@/components/ui/Hero";
import RecentWorksSlider from "@/components/home/RecentWorksSlider";
import { getRecentPhotos } from "@/lib/actions/photos";
import { getSiteSettings } from "@/lib/actions/settings";
import { Suspense } from "react";
import HomeFeaturedSection from "@/components/home/HomeSections";

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

      {/* Recent Works Section (Cinematic Slider) */}
      <Suspense fallback={<div className="text-center py-20 bg-[#0a0a0a]"><div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" /></div>}>
        {displayPhotos.length > 0 ? (
          <RecentWorksSlider photos={displayPhotos as any[]} />
        ) : (
          <div className="text-center py-20 bg-[#0a0a0a] text-white/40 tracking-[0.2em] uppercase text-sm">
            <p>No recent works found.</p>
          </div>
        )}
      </Suspense>
    </main>
  );
}
