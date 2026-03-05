'use server';

import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { getIndexClient } from '@/lib/algolia';
import { revalidatePath } from 'next/cache';

const INDEX_NAME = 'photos';

export async function rebuildAlgoliaIndex() {
    try {
        const db = getAdminFirestore();
        const client = getIndexClient();

        console.log('[Algolia] インデックス再構築を開始...');

        // 1. Firestoreから全写真を取得
        const snapshot = await db.collection('photos').get();
        const photos = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                objectID: doc.id,
                id: doc.id,
                title: data.title || '',
                url: data.url || '',
                subjectName: data.subjectName || '',
                characterName: data.characterName || '',
                event: data.event || '',
                location: data.location || '',
                category: data.category || '',
                categoryId: data.categoryId || data.category || '',
                tags: data.tags || [],
                shotAt: data.shotAt?.toDate?.()?.getTime() ??
                    (typeof data.shotAt === 'string' ? new Date(data.shotAt).getTime() : data.shotAt || 0),
                createdAt: data.createdAt?.toDate?.()?.getTime() ??
                    (typeof data.createdAt === 'string' ? new Date(data.createdAt).getTime() : data.createdAt || 0),
            };
        });

        console.log(`[Algolia] Firestoreから${photos.length}件の写真を取得しました。`);

        if (photos.length === 0) {
            return { success: false, error: 'Firestoreに写真データが見つかりませんでした。' };
        }

        // 2. バッチで一括送信（最大1000件/バッチ）
        const BATCH_SIZE = 500;
        let totalSaved = 0;

        for (let i = 0; i < photos.length; i += BATCH_SIZE) {
            const batch = photos.slice(i, i + BATCH_SIZE);
            try {
                await client.saveObjects({
                    indexName: INDEX_NAME,
                    objects: batch,
                });
                totalSaved += batch.length;
                console.log(`[Algolia] ${totalSaved}/${photos.length}件を同期しました。`);
            } catch (batchError: any) {
                console.error(`[Algolia] バッチ送信エラー:`, batchError);
                return { success: false, error: `バッチ送信失敗: ${batchError.message}` };
            }
        }

        console.log(`[Algolia] 全件同期完了: ${totalSaved}件`);

        revalidatePath('/search');
        return { success: true, count: totalSaved };
    } catch (error: any) {
        console.error('[Algolia] 再構築エラー:', error);
        return { success: false, error: error.message };
    }
}
