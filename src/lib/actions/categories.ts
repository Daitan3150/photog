'use server';

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
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        const snapshot = await db.collection('categories').orderBy('order', 'asc').get();

        console.log(`Server Action: Found ${snapshot.size} categories.`);

        const categories = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log(`- Category: ${doc.id} (${data.name})`);
            return {
                id: doc.id,
                name: data.name,
                order: data.order,
                coverUrl: data.coverUrl || '',
                // Create a plain object, excluding Firestore Timestamps
            };
        }) as Category[];

        return { success: true, data: categories };
    } catch (error: any) {
        console.error('Error fetching categories:', error);
        return { success: false, data: [], error: error.message };
    }
}
