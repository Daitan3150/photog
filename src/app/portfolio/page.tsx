import { Suspense } from 'react';
import PhotoGrid from "@/components/gallery/PhotoGrid";
import { searchPhotos } from '@/lib/actions/photos';
import { getPublicModels } from '@/lib/actions/users';
import CategoryFilter from "@/components/portfolio/CategoryFilter";
import PortfolioHeader from "@/components/portfolio/PortfolioHeader";
import EmptyPortfolio from "@/components/portfolio/EmptyPortfolio";
import LensFilter from "@/components/portfolio/LensFilter";
import PortfolioViewModeToggle from "@/components/portfolio/PortfolioViewModeToggle";
import PortraitScrollSection from "@/components/gallery/PortraitScrollSection";
import CosplayScrollSection from "@/components/gallery/CosplayScrollSection";
import { Metadata } from 'next';

// Revalidate every 1 hour (ISR)
export const revalidate = 3600;

interface PageProps {
    searchParams: Promise<{ category?: string; img?: string; lens?: string; view?: string }>;
}

export const metadata: Metadata = {
    title: "Portfolio",
    description: "Browse clear and artistic photography collections by category.",
};

export default async function PortfolioPage({ searchParams }: PageProps) {
    // URLからカテゴリーと写真IDを取得
    const params = await searchParams;
    let currentCategory = params.category || 'cosplay';

    const currentLens = params.lens || '';
    const currentView = params.view === 'lens' ? 'lens' : 'category';
    const effectiveCategory = currentView === 'lens' ? undefined : currentCategory;

    const allPhotos = await searchPhotos('', {
        category: effectiveCategory,
        limit: 500
    });
    const filteredPhotos = allPhotos as any[];

    const isPortrait = currentView === 'category' && currentCategory === 'portrait';
    const isCosplay = currentView === 'category' && currentCategory === 'cosplay';

    const availableLensModels = Array.from(new Set(
        filteredPhotos.flatMap((photo: any) => photo.exif?.LensModel ? [photo.exif.LensModel] : [])
    )).sort().filter(Boolean);
    const lensFilteredPhotos = currentLens
        ? filteredPhotos.filter((photo: any) => photo.exif?.LensModel === currentLens)
        : filteredPhotos;

    const displayPhotos = currentView === 'lens' ? lensFilteredPhotos : filteredPhotos;

    // 公開用モデルデータ（生没年）の取得とマッピング
    const modelsResult = await getPublicModels();
    const publicModelsMap = new Map<string, { 
        birthday?: string; 
        birthYear?: string;
        birthMonth?: string;
        birthDay?: string;
        approximateAge?: string;
        showBirthYear?: boolean;
        showAge?: boolean;
        ageDisplayMode?: 'blurred' | 'formal';
        deceasedDate?: string; 
        deceasedYear?: string;
        deceasedMonth?: string;
        deceasedDay?: string;
        realName?: string;
    }>();
    if (modelsResult.success && modelsResult.models) {
        modelsResult.models.forEach(m => {
            publicModelsMap.set(m.displayName, { 
                birthday: m.birthday, 
                birthYear: m.birthYear,
                birthMonth: m.birthMonth,
                birthDay: m.birthDay,
                approximateAge: m.approximateAge,
                showBirthYear: m.showBirthYear,
                showAge: m.showAge,
                ageDisplayMode: m.ageDisplayMode,
                deceasedDate: m.deceasedDate,
                deceasedYear: m.deceasedYear,
                deceasedMonth: m.deceasedMonth,
                deceasedDay: m.deceasedDay,
                realName: m.name
            });
        });
    }

    // ポートレートまたはコスプレカテゴリーの場合、モデル名（subjectName）ごとにグループ化する
    const shouldGroup = isPortrait || isCosplay;

    const groupedPhotos: Record<string, any[]> = {};
    const singlePhotoGroups: { modelName: string; photos: any[] }[] = [];

    if (shouldGroup) {
        displayPhotos.forEach((photo: any) => {
            const modelName = photo.subjectName || 'Unknown';
            if (!groupedPhotos[modelName]) groupedPhotos[modelName] = [];
            groupedPhotos[modelName].push(photo);
        });

        if (isCosplay) {
            for (const [modelName, photos] of Object.entries(groupedPhotos)) {
                if (photos.length === 1) {
                    singlePhotoGroups.push({ modelName, photos });
                    delete groupedPhotos[modelName];
                }
            }
        }
    }

    return (
        <main className="min-h-screen pt-32 pb-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <PortfolioHeader />

                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <PortfolioViewModeToggle currentView={currentView} />
                        <div className="text-sm text-gray-600">
                            {currentView === 'lens'
                                ? '全作品からレンズごとに表示します。'
                                : 'カテゴリ別に作品を分類して表示します。'}
                        </div>
                    </div>
                    {currentView === 'category' ? (
                        <CategoryFilter currentCategory={currentCategory} />
                    ) : (
                        availableLensModels.length > 0 && (
                            <LensFilter currentLens={currentLens} lensOptions={availableLensModels} />
                        )
                    )}
                </div>

                <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" /></div>}>
                    <div className="mt-12">
                        {displayPhotos.length > 0 ? (
                            currentView === 'lens' ? (
                                <PhotoGrid photos={displayPhotos} />
                            ) : isPortrait ? (
                                <div className="space-y-24">
                                    {Object.entries(groupedPhotos).map(([modelName, photos]) => {
                                        const modelInfo = publicModelsMap.get(modelName);
                                        return (
                                            <PortraitScrollSection
                                                key={modelName}
                                                modelName={modelName}
                                                photos={photos}
                                                birthday={modelInfo?.birthday}
                                                birthYear={modelInfo?.birthYear}
                                                birthMonth={modelInfo?.birthMonth}
                                                birthDay={modelInfo?.birthDay}
                                                approximateAge={modelInfo?.approximateAge}
                                                showBirthYear={modelInfo?.showBirthYear}
                                                showAge={modelInfo?.showAge}
                                                ageDisplayMode={modelInfo?.ageDisplayMode}
                                                deceasedDate={modelInfo?.deceasedDate}
                                                deceasedYear={modelInfo?.deceasedYear}
                                                deceasedMonth={modelInfo?.deceasedMonth}
                                                deceasedDay={modelInfo?.deceasedDay}
                                                realName={modelInfo?.realName}
                                            />
                                        );
                                    })}
                                </div>
                            ) : isCosplay ? (
                                <div className="space-y-20">
                                    {Object.entries(groupedPhotos).map(([modelName, photos]) => {
                                        const modelInfo = publicModelsMap.get(modelName);
                                        return (
                                            <CosplayScrollSection
                                                key={modelName}
                                                modelName={modelName}
                                                photos={photos}
                                                birthday={modelInfo?.birthday}
                                                birthYear={modelInfo?.birthYear}
                                                birthMonth={modelInfo?.birthMonth}
                                                birthDay={modelInfo?.birthDay}
                                                approximateAge={modelInfo?.approximateAge}
                                                showBirthYear={modelInfo?.showBirthYear}
                                                showAge={modelInfo?.showAge}
                                                ageDisplayMode={modelInfo?.ageDisplayMode}
                                                deceasedDate={modelInfo?.deceasedDate}
                                                deceasedYear={modelInfo?.deceasedYear}
                                                deceasedMonth={modelInfo?.deceasedMonth}
                                                deceasedDay={modelInfo?.deceasedDay}
                                                realName={modelInfo?.realName}
                                            />
                                        );
                                    })}

                                    {singlePhotoGroups.length > 0 && (
                                        <div className="space-y-24">
                                            {singlePhotoGroups.map(({ modelName, photos }) => {
                                                const modelInfo = publicModelsMap.get(modelName);
                                                return (
                                                    <CosplayScrollSection
                                                        key={modelName}
                                                        modelName={modelName}
                                                        photos={photos}
                                                        birthday={modelInfo?.birthday}
                                                        birthYear={modelInfo?.birthYear}
                                                        birthMonth={modelInfo?.birthMonth}
                                                        birthDay={modelInfo?.birthDay}
                                                        approximateAge={modelInfo?.approximateAge}
                                                        showBirthYear={modelInfo?.showBirthYear}
                                                        showAge={modelInfo?.showAge}
                                                        ageDisplayMode={modelInfo?.ageDisplayMode}
                                                        deceasedDate={modelInfo?.deceasedDate}
                                                        deceasedYear={modelInfo?.deceasedYear}
                                                        deceasedMonth={modelInfo?.deceasedMonth}
                                                        deceasedDay={modelInfo?.deceasedDay}
                                                        realName={modelInfo?.realName}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <PhotoGrid photos={displayPhotos} />
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
