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

import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Portfolio",
    description: "Browse clear and artistic photography collections by category.",
};

export default async function PortfolioPage({ searchParams }: PageProps) {
    // URLからカテゴリーと写真IDを取得
    const params = await searchParams;
    let currentCategory = params.category || 'cosplay';
    const imgId = (params as any).img;

    // サーバーサイドでのフィルタリング（Firestoreクエリを使用）
    const allPhotos = await searchPhotos('', {
        category: currentCategory,
        limit: 100 // より多くの写真を表示可能に
    });

    const filteredPhotos = allPhotos;

    // ポートレートカテゴリーの場合のみ、モデル名（subjectName）ごとにグループ化する
    const isPortrait = currentCategory === 'portrait';
    const groupedPhotos: Record<string, typeof filteredPhotos> = {};

    if (isPortrait) {
        filteredPhotos.forEach(photo => {
            const modelName = photo.subjectName || 'Unknown Model';
            if (!groupedPhotos[modelName]) groupedPhotos[modelName] = [];
            groupedPhotos[modelName].push(photo);
        });
    }

    return (
        <main className="min-h-screen pt-32 pb-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <PortfolioHeader />

                <CategoryFilter currentCategory={currentCategory} />

                <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" /></div>}>
                    <div className="mt-12">
                        {filteredPhotos.length > 0 ? (
                            isPortrait ? (
                                <div className="space-y-24">
                                    {Object.entries(groupedPhotos).map(([modelName, photos]) => (
                                        <PortraitScrollSection
                                            key={modelName}
                                            modelName={modelName}
                                            photos={photos}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <PhotoGrid photos={filteredPhotos} />
                            )
                        ) : (
                            <EmptyPortfolio />
                        )}
                    </div>
                </Suspense>
            </div>
        </main>
    );
}

// 動的インポートを使用してクライアントコンポーネントを読み込む
import dynamic from 'next/dynamic';
const PortraitScrollSection = dynamic(() => import('@/components/gallery/PortraitScrollSection'), {
    ssr: false,
});

