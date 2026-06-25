import { Suspense } from 'react';
import PhotoGrid from "@/components/gallery/PhotoGrid";
import { searchPhotos } from '@/lib/actions/photos';
import { getPublicModels } from '@/lib/actions/users';
import CategoryFilter from "@/components/portfolio/CategoryFilter";
import PortfolioHeader from "@/components/portfolio/PortfolioHeader";
import EmptyPortfolio from "@/components/portfolio/EmptyPortfolio";
import PortraitScrollSection from "@/components/gallery/PortraitScrollSection";
import CosplayScrollSection from "@/components/gallery/CosplayScrollSection";
import { Metadata } from 'next';

// Revalidate every 1 hour (ISR)
export const revalidate = 3600;

interface PageProps {
    searchParams: Promise<{ category?: string; img?: string }>;
}

export const metadata: Metadata = {
    title: "Portfolio",
    description: "Browse clear and artistic photography collections by category.",
};

export default async function PortfolioPage({ searchParams }: PageProps) {
    // URLからカテゴリーと写真IDを取得
    const params = await searchParams;
    let currentCategory = params.category || 'cosplay';

    // サーバーサイドでのフィルタリング（Firestoreクエリを使用）
    const allPhotos = await searchPhotos('', {
        category: currentCategory,
        limit: 100
    });

    const filteredPhotos = allPhotos as any[];

    // 公開用モデルデータ（生没年）の取得とマッピング
    const modelsResult = await getPublicModels();
    const publicModelsMap = new Map<string, { 
        birthday?: string; 
        birthYear?: string;
        birthMonth?: string;
        birthDay?: string;
        approximateAge?: string;
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
                deceasedDate: m.deceasedDate,
                deceasedYear: m.deceasedYear,
                deceasedMonth: m.deceasedMonth,
                deceasedDay: m.deceasedDay,
                realName: m.name
            });
        });
    }

    // ポートレートまたはコスプレカテゴリーの場合、モデル名（subjectName）ごとにグループ化する
    const isPortrait = currentCategory === 'portrait';
    const isCosplay = currentCategory === 'cosplay';
    const shouldGroup = isPortrait || isCosplay;

    const groupedPhotos: Record<string, any[]> = {};
    const singlePhotos: any[] = []; // コスプレで1枚だけのモデルは通常グリッド表示

    if (shouldGroup) {
        filteredPhotos.forEach((photo: any) => {
            const modelName = photo.subjectName || 'Unknown';
            if (!groupedPhotos[modelName]) groupedPhotos[modelName] = [];
            groupedPhotos[modelName].push(photo);
        });

        // コスプレの場合でも、ポートレートと同様に全てのモデルをグループとして表示し、名前や生年月日が表示されるようにする
        // (以前は1枚だけのモデルを通常のグリッドに分けていたが、要望によりすべてセクション表示する)
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
                                    {/* グループ化されたモデル（2枚以上）→ 横スライド表示 */}
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
                                                deceasedDate={modelInfo?.deceasedDate}
                                                deceasedYear={modelInfo?.deceasedYear}
                                                deceasedMonth={modelInfo?.deceasedMonth}
                                                deceasedDay={modelInfo?.deceasedDay}
                                                realName={modelInfo?.realName}
                                            />
                                        );
                                    })}

                                    {/* 1枚だけのモデル → 通常のPhotoGridで表示 */}
                                    {singlePhotos.length > 0 && (
                                        <div>
                                            {Object.keys(groupedPhotos).length > 0 && (
                                                <div className="px-6 md:px-0 mb-8">
                                                    <span className="text-[10px] md:text-xs text-neutral-400 uppercase tracking-[0.5em] block mb-2 font-light">
                                                        More Cosplay
                                                    </span>
                                                    <div className="w-12 h-[1px] bg-neutral-200" />
                                                </div>
                                            )}
                                            <PhotoGrid photos={singlePhotos} />
                                        </div>
                                    )}
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
