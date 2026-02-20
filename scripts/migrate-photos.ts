/**
 * Migration script to fix Firestore photo data inconsistencies
 * 
 * This script:
 * 1. Normalizes field names (userId -> uploaderId, category -> categoryId)
 * 2. Converts string createdAt to Timestamp
 * 3. Adds missing fields with defaults
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!getApps().length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    initializeApp({
        credential: cert({
            projectId: 'daitan-portfolio',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
    });
}

const db = getFirestore();

interface OldPhotoData {
    userId?: string;
    category?: string;
    createdAt?: string | Timestamp;
    [key: string]: any;
}

interface NewPhotoData {
    uploaderId: string;
    categoryId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    url: string;
    publicId: string;
    title: string;
    location: string;
    subjectName: string;
    [key: string]: any;
}

async function migratePhotos() {
    console.log('🔄 Starting photo migration...\n');

    const photosRef = db.collection('photos');
    const snapshot = await photosRef.get();

    console.log(`📊 Found ${snapshot.size} photos to check\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const doc of snapshot.docs) {
        try {
            const data = doc.data() as OldPhotoData;
            const updates: Partial<NewPhotoData> = {};
            let needsUpdate = false;

            // 1. Rename userId to uploaderId
            if (data.userId && !data.uploaderId) {
                updates.uploaderId = data.userId;
                needsUpdate = true;
                console.log(`  ✓ ${doc.id}: userId -> uploaderId`);
            }

            // 2. Rename category to categoryId
            if (data.category && !data.categoryId) {
                updates.categoryId = data.category;
                needsUpdate = true;
                console.log(`  ✓ ${doc.id}: category -> categoryId`);
            }

            // 3. Convert string createdAt to Timestamp
            if (typeof data.createdAt === 'string') {
                updates.createdAt = Timestamp.fromDate(new Date(data.createdAt));
                needsUpdate = true;
                console.log(`  ✓ ${doc.id}: String createdAt -> Timestamp`);
            }

            // 4. Add missing fields with defaults
            if (!data.title) {
                updates.title = '';
                needsUpdate = true;
            }
            if (!data.location) {
                updates.location = '';
                needsUpdate = true;
            }
            if (!data.subjectName) {
                updates.subjectName = '';
                needsUpdate = true;
            }

            // 5. Update updatedAt
            if (needsUpdate) {
                updates.updatedAt = Timestamp.now();
            }

            // Apply updates
            if (needsUpdate) {
                await doc.ref.update(updates);

                // Remove old fields
                const fieldsToDelete: any = {};
                if (data.userId && updates.uploaderId) {
                    fieldsToDelete.userId = FieldValue.delete();
                }
                if (data.category && updates.categoryId) {
                    fieldsToDelete.category = FieldValue.delete();
                }

                if (Object.keys(fieldsToDelete).length > 0) {
                    await doc.ref.update(fieldsToDelete);
                    console.log(`  ✓ ${doc.id}: Removed old fields`);
                }

                migratedCount++;
                console.log(`  ✅ ${doc.id}: Migrated successfully\n`);
            } else {
                skippedCount++;
            }
        } catch (error) {
            errorCount++;
            console.error(`  ❌ ${doc.id}: Error -`, error);
        }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`  ✅ Migrated: ${migratedCount}`);
    console.log(`  ⏭️  Skipped: ${skippedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📊 Total: ${snapshot.size}`);

    return { migratedCount, skippedCount, errorCount };
}

// Run migration
migratePhotos()
    .then((result) => {
        console.log('\n✨ Migration completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });
