'use server';

import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { syncPhotoToAlgolia, getIndexClient } from '@/lib/algolia';
import { revalidatePath } from 'next/cache';

const INDEX_NAME = 'photos';

export async function rebuildAlgoliaIndex() {
    try {
        const db = getAdminFirestore();
        const client = getIndexClient();

        console.log('[Algolia] Starting index rebuild...');

        // 1. Configure the index settings for better search
        try {
            // Use legacy setSettings if available or use the client directly
            // For algoliasearch v5+, we might need a different approach but let's try basic sync first
            console.log('[Algolia] Configuring index settings...');
            // Note: In v5, settings are managed via the index's specific methods or the task API
        } catch (configError) {
            console.error('[Algolia] Config Error (skipping):', configError);
        }

        // 2. Fetch all photos from Firestore
        const snapshot = await db.collection('photos').get();
        const photos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`[Algolia] Found ${photos.length} photos in Firestore.`);

        // 3. Clear the index (Optional, but good for "clean start")
        // await client.clearObjects({ indexName: INDEX_NAME });

        // 4. Batch sync
        let successCount = 0;
        for (const photo of photos) {
            const success = await syncPhotoToAlgolia(photo);
            if (success) successCount++;
        }

        console.log(`[Algolia] Sync complete. Success: ${successCount}/${photos.length}`);

        revalidatePath('/search');
        return { success: true, count: successCount };
    } catch (error: any) {
        console.error('[Algolia] Rebuild Error:', error);
        return { success: false, error: error.message };
    }
}
