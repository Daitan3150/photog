import { Suspense } from 'react';
import PhotoGrid, { type Photo } from "@/components/gallery/PhotoGrid";
import LensDetailPanel from '@/components/portfolio/LensDetailPanel';
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
import { getProfileServer } from '@/lib/actions/profile';

// Revalidate every 1 hour (ISR)
export const revalidate = 3600;

interface PageProps {
    searchParams: Promise<{ category?: string; img?: string; lens?: string; view?: string; cameraType?: string }>;
}

export const metadata: Metadata = {
    title: "Portfolio",
    description: "Browse clear and artistic photography collections by category.",
};

export default async function PortfolioPage({ searchParams }: PageProps) {
    // URLからカテゴリーと写真IDを取得
    const params = await searchParams;
    const currentCategory = params.category || 'cosplay';

    const currentView = params.view === 'lens' ? 'lens' : 'category';
    const effectiveCategory = currentView === 'lens' ? undefined : currentCategory;

    const allPhotos = await searchPhotos('', {
        category: effectiveCategory,
        limit: 500
    });
    const filteredPhotos = allPhotos as Photo[];

    // カメラ種類フィルター
    const currentCameraType = params.cameraType || '';
    const cameraTypeFilteredPhotos = currentCameraType
        ? filteredPhotos.filter((photo: Photo) => (photo as any).cameraType === currentCameraType)
        : filteredPhotos;

    const availableLensModels = Array.from(new Set(
        cameraTypeFilteredPhotos.flatMap((photo: Photo) => photo.exif?.LensModel ? [photo.exif.LensModel] : [])
    )).sort().filter(Boolean);
    const currentLens = currentView === 'lens'
        ? (params.lens || availableLensModels[0] || '')
        : '';

    const lensFilteredPhotos = currentLens
        ? cameraTypeFilteredPhotos.filter((photo: Photo) => photo.exif?.LensModel === currentLens)
        : cameraTypeFilteredPhotos;

    const displayPhotos = currentView === 'lens' ? lensFilteredPhotos : cameraTypeFilteredPhotos;
    const portraitCategories = ['portrait'];
    const isPortraitStyle = currentView === 'category' && portraitCategories.includes(currentCategory);
    const isCosplay = currentView === 'category' && currentCategory === 'cosplay';

    // 公開用モデルデータ（生没年）の取得とマッピング
    const modelsResult = await getPublicModels();
    const profileResult = await getProfileServer();
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

    const lensMetadataMap = new Map<string, { name?: string; imageUrl?: string; specs?: string[]; description?: string }>();
    type LensEntry = { name?: string; imageUrl?: string; image?: string; specs?: unknown; description?: string };
    const lensMetadataList = Array.isArray((profileResult as { data?: { lensDetails?: unknown } })?.data?.lensDetails)
        ? ((profileResult as { data: { lensDetails: unknown[] } }).data.lensDetails as LensEntry[])
        : [];
    lensMetadataList.forEach((entry) => {
        if (entry?.name) {
            lensMetadataMap.set(entry.name, {
                name: entry.name,
                imageUrl: entry.imageUrl || entry.image || '',
                specs: Array.isArray(entry.specs) ? entry.specs.filter((value): value is string => typeof value === 'string' && Boolean(value)) : [],
                description: entry.description || '',
            });
        }
    });

    const groupedPhotos: Record<string, Photo[]> = {};
    const singlePhotoGroups: { modelName: string; photos: Photo[] }[] = [];

    if (isPortraitStyle || isCosplay) {
        displayPhotos.forEach((photo: Photo) => {
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
        <main className="min-h-screen pt-24 pb-16 bg-white">
            <div className="max-w-7xl mx-auto px-3 md:px-6">
                <PortfolioHeader />

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
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

                    {/* カメラ種類フィルター */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Camera:</span>
                        {[
                            { value: '', label: 'すべて' },
                            { value: 'mirrorless', label: 'ミラーレス一眼' },
                            { value: 'compact', label: 'コンパクト' },
                            { value: 'dslr', label: '一眼レフ' },
                            { value: 'film', label: 'フィルム' },
                        ].map(opt => {
                            const isActive = currentCameraType === opt.value;
                            const href = (() => {
                                const p = new URLSearchParams();
                                if (currentView === 'lens') p.set('view', 'lens');
                                if (currentView === 'category' && currentCategory !== 'cosplay') p.set('category', currentCategory);
                                if (currentLens) p.set('lens', currentLens);
                                if (opt.value) p.set('cameraType', opt.value);
                                const qs = p.toString();
                                return `/portfolio${qs ? `?${qs}` : ''}`;
                            })();
                            return (
                                <a
                                    key={opt.value}
                                    href={href}
                                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                                        isActive
                                            ? 'bg-black text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                >
                                    {opt.label}
                                </a>
                            );
                        })}
                    </div>
                </div>

                {currentView === 'lens' && currentLens && (
                    <LensDetailPanel
                        lensName={currentLens}
                        metadata={lensMetadataMap.get(currentLens)}
                        photoCount={displayPhotos.length}
                        photos={displayPhotos}
                    />
                )}

                <div className="mt-4">
                </div>

                {displayPhotos.length > 0 ? (
                    <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" /></div>}>
                        <div className="mt-8">
                            {(() => {
                                if (currentView === 'lens') {
                                    return null;
                                }

                                if (isPortraitStyle) {
                                    return (
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
                                    );
                                }

                                if (isCosplay) {
                                    return (
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
                                    );
                                }

                                return <PhotoGrid photos={displayPhotos} />;
                            })()}
                        </div>
                    </Suspense>
                ) : (
                    <EmptyPortfolio />
                )}
            </div>
        </main>
    );
}
