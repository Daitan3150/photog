import SearchInterface from '@/components/search/SearchInterface';
import { Suspense } from 'react';

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q: string }>;
}) {
    const { q } = await searchParams;
    const initialQuery = q || '';

    return (
        <main className="min-h-screen pt-32 pb-24 px-4 md:px-8 bg-white">
            <div className="max-w-7xl mx-auto">
                <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" /></div>}>
                    <SearchInterface initialQuery={initialQuery} />
                </Suspense>
            </div>
        </main>
    );
}
