'use server';

import { getCachedData, setCachedData } from '@/lib/worker-cache';

// Removed top-level import to prevent client-side leak

export type Category = {
    id: string;
    name: string;
    order: number;
    coverUrl?: string;
};

export interface GetCategoriesResult {
    success: boolean;
    data: Category[];
    error?: string;
}

export async function getCategories(): Promise<GetCategoriesResult> {
    console.log('Server Action: Fetching categories...');

    // Diagnostic logs for Production troubleshooting
    if (!process.env.FIREBASE_PROJECT_ID) console.error('MISSING: FIREBASE_PROJECT_ID');
    if (!process.env.FIREBASE_CLIENT_EMAIL) console.error('MISSING: FIREBASE_CLIENT_EMAIL');
    if (!process.env.FIREBASE_PRIVATE_KEY) console.error('MISSING: FIREBASE_PRIVATE_KEY');

    try {
        const cached = await getCachedData<GetCategoriesResult>('categories_list');
        if (cached?.success && cached.data?.length) {
            console.log('[getCategories] Returning cached categories.');
            return cached;
        }

        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        let db;
        try {
            db = getAdminFirestore();
        } catch (initError: any) {
            console.error('[getCategories] Firestore initialization failed:', initError.message);
            return { success: false, data: [], error: 'Database initialization failed' };
        }

        const snapshot = await db.collection('categories').orderBy('order', 'asc').get();

        console.log(`Server Action: Found ${snapshot.size} categories.`);

        const categories = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                order: data.order,
                coverUrl: data.coverUrl || '',
            };
        }) as Category[];

        await setCachedData('categories_list', { success: true, data: categories }, 3600);
        return { success: true, data: categories };
    } catch (error: any) {
        console.error('Error fetching categories:', error);
        return { success: false, data: [], error: error.message || 'Unknown error occurred' };
    }
}
