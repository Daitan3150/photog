import { getFirebaseAdmin } from '../firebaseAdmin';
import { db as pgDb } from './index';
import { photos as photoTable, subjects as subjectTable, tags as tagTable, photoTags as photoTagsTable } from './schema';
import { serializeData } from '../utils/serialization';
import { getCachedData, setCachedData } from '../worker-cache';

/**
 * 🛠️ メンテナンス：同期の自動トリガー
 * KV をチェックし、まだ同期されていなければ実行します。
 */
export async function checkAndTriggerSync() {
    try {
        const isSynced = await getCachedData<boolean>('db_synced');
        if (isSynced) return { success: true, message: 'Already synced' };

        console.log('Initiating automatic background sync...');
        // 背景で実行（レスポンスをブロックしない）
        syncFirestoreToNeon().then(async (res) => {
            if (res.success) {
                await setCachedData('db_synced', true);
            }
        });

        return { success: true, message: 'Sync started in background' };
    } catch (error) {
        console.error('Error in checkAndTriggerSync:', error);
        return { success: false, error };
    }
}

/**
 * 🚀 Firestore -> Neon 同期スクリプト
 * 既存の全データを PostgreSQL に移行します。
 */
export async function syncFirestoreToNeon() {
    console.log('Starting Firestore to Neon sync...');

    try {
        const admin = await getFirebaseAdmin();
        const firestore = admin.firestore();

        // 1. Fetch all photos
        const snapshot = await firestore.collection('photos').get();
        console.log(`Found ${snapshot.size} photos in Firestore.`);

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const photoId = doc.id;

            // Insert Photo
            await pgDb.insert(photoTable).values({
                id: photoId,
                uploaderId: data.uploaderId || 'legacy',
                url: data.url,
                publicId: data.publicId,
                title: data.title || null,
                subjectName: data.subjectName || null,
                characterName: data.characterName || null,
                location: data.location || null,
                latitude: data.latitude || null,
                longitude: data.longitude || null,
                shotAt: data.shotAt ? data.shotAt.toDate() : null,
                snsUrl: data.snsUrl || null,
                categoryId: data.categoryId || null,
                displayMode: data.displayMode || 'title',
                exif: data.exif || null,
                focalPoint: data.focalPoint || null,
                createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
                updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
            }).onConflictDoUpdate({
                target: [photoTable.id],
                set: { updatedAt: new Date() }
            });

            // Sync Subject
            if (data.subjectName) {
                await pgDb.insert(subjectTable).values({
                    name: data.subjectName,
                    snsUrl: data.snsUrl || null,
                    autoRegistered: true
                }).onConflictDoUpdate({
                    target: [subjectTable.name],
                    set: { snsUrl: data.snsUrl || null }
                });
            }

            // Sync Tags
            if (data.tags && Array.isArray(data.tags)) {
                for (const tagName of data.tags) {
                    const tagResult = await pgDb.insert(tagTable).values({ name: tagName })
                        .onConflictDoUpdate({ target: [tagTable.name], set: { name: tagName } })
                        .returning({ id: tagTable.id });

                    if (tagResult.length > 0) {
                        await pgDb.insert(photoTagsTable).values({
                            photoId: photoId,
                            tagId: tagResult[0].id
                        }).onConflictDoNothing();
                    }
                }
            }

            console.log(`Synced photo: ${photoId}`);
        }

        console.log('✅ Sync completed successfully!');
        return { success: true };
    } catch (error) {
        console.error('❌ Sync failed:', error);
        throw error;
    }
}
