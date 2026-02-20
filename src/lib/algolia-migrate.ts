/**
 * Utility to migrate all existing Firestore photos to Algolia
 * Usage: npx tsx src/lib/algolia-migrate.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { syncPhotoToAlgolia } from './algolia';
import { getAdminFirestoreForScript } from './firebaseAdminScript';

async function migrate() {
    console.log('🚀 Starting migration to Algolia...');

    const db = getAdminFirestoreForScript();
    const snapshot = await db.collection('photos').get();

    console.log(`📸 Found ${snapshot.size} photos to migrate.`);

    let successCount = 0;
    let failCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const success = await syncPhotoToAlgolia({
            id: doc.id,
            ...data,
            category: data.categoryId
        });

        if (success) {
            successCount++;
            console.log(`✅ Indexed: ${doc.id} (${data.title || 'Untitled'})`);
        } else {
            failCount++;
            console.log(`❌ Failed: ${doc.id}`);
        }
    }

    console.log('\n✨ Migration Complete!');
    console.log(`Total: ${snapshot.size}`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);

    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
