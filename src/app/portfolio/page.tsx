import { Suspense } from 'react';
import PhotoGrid from "@/components/gallery/PhotoGrid";
import { searchPhotos } from '@/lib/actions/photos';
import CategoryFilter from "@/components/portfolio/CategoryFilter";
import PortfolioHeader from "@/components/portfolio/PortfolioHeader";
import EmptyPortfolio from "@/components/portfolio/EmptyPortfolio";

// Revalidate every 1 hour (ISR)
export const revalidate = 3600;

interface PageProps {
    searchParams: Promise<{ category?: string }>;
}

export default async function PortfolioPage({ searchParams }: PageProps) {
    const params = await searchParams;
    let currentCategory = params.category;
    const imgId = (params as any).img;

    const allPhotos = await searchPhotos('');

    // If imgId is provided but category is not, find the photo's category
    if (imgId && !currentCategory) {
        const targetPhoto = allPhotos.find((p: any) => p.id === imgId);
        if (targetPhoto) {
            currentCategory = targetPhoto.categoryId || targetPhoto.category;
        }
    }

    // Default fallback
    if (!currentCategory) currentCategory = 'cosplay';

    const filteredPhotos = allPhotos.filter((p: any) =>
        p.categoryId === currentCategory ||
        p.category === currentCategory ||
        (currentCategory === 'snapshot' && p.categoryId === 'snap')
    );

    return (
        <main className="min-h-screen pt-32 pb-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <PortfolioHeader />

                <CategoryFilter currentCategory={currentCategory} />

                <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" /></div>}>
                    <div className="mt-12">
                        {filteredPhotos.length > 0 ? (
                            <PhotoGrid photos={filteredPhotos} />
                        ) : (
                            <EmptyPortfolio />
                        )}
                    </div>
                </Suspense>
            </div>
        </main>
    );
}
