'use server';

import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { algoliasearch } from 'algoliasearch';
import { revalidatePath } from 'next/cache';

const INDEX_NAME = 'photos';

/**
 * サーバーアクション専用のAlgolia管理クライアントを作成
 * シングルトンキャッシュを使わず、環境変数から毎回読み込む
 */
function createAdminClient() {
    const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
    const adminKey = process.env.ALGOLIA_ADMIN_KEY;

    console.log(`[Algolia] App ID: ${appId ? appId.substring(0, 4) + '...' : 'MISSING'}`);
    console.log(`[Algolia] Admin Key: ${adminKey ? adminKey.substring(0, 4) + '...' : 'MISSING'}`);

    if (!appId || !adminKey) {
        throw new Error(`Algolia 設定が不足しています (AppID: ${!!appId}, AdminKey: ${!!adminKey})`);
    }

    return algoliasearch(appId, adminKey);
}

export async function rebuildAlgoliaIndex() {
    try {
        const db = getAdminFirestore();
        const client = createAdminClient();

        console.log('[Algolia] インデックス再構築を開始...');

        // 1. Firestoreから全写真を取得
        const snapshot = await db.collection('photos').get();

        // 2. 最小限のデータだけ抽出（Copilotのアドバイスに従い軽量化）
        const records = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                objectID: doc.id,
                subjectName: data.subjectName || '',
                characterName: data.characterName || '',
                event: data.event || '',
                location: data.location || '',
                category: data.category || '',
                tags: data.tags || [],
                url: data.url || '',
                title: data.title || '',
                shotAt: data.shotAt?.toDate?.()?.getTime?.() ??
                    (typeof data.shotAt === 'string' ? new Date(data.shotAt).getTime() : data.shotAt || 0),
            };
        });

        console.log(`[Algolia] Firestoreから${records.length}件の写真を取得。`);

        if (records.length === 0) {
            return { success: false, error: 'Firestoreに写真データが見つかりませんでした。' };
        }

        // 3. バッチで一括送信
        const BATCH_SIZE = 500;
        let totalSaved = 0;

        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE);
            await client.saveObjects({
                indexName: INDEX_NAME,
                objects: batch,
            });
            totalSaved += batch.length;
            console.log(`[Algolia] ${totalSaved}/${records.length}件を同期完了。`);
        }

        // 4. 検索対象フィールドを設定（名前・イベント・タグのみ検索対象）
        try {
            await client.setSettings({
                indexName: INDEX_NAME,
                indexSettings: {
                    searchableAttributes: [
                        'subjectName',
                        'characterName',
                        'event',
                        'location',
                        'tags',
                        'title',
                    ],
                    attributesForFaceting: [
                        'category',
                        'tags',
                        'subjectName',
                        'event',
                        'location',
                    ],
                },
            });
            console.log('[Algolia] 検索設定を更新しました。');
        } catch (settingsError) {
            console.warn('[Algolia] 検索設定の更新に失敗（データ同期は成功）:', settingsError);
        }

        console.log(`[Algolia] 全件同期完了: ${totalSaved}件`);
        revalidatePath('/search');
        return { success: true, count: totalSaved };
    } catch (error: any) {
        console.error('[Algolia] 再構築エラー:', error.message);
        return { success: false, error: error.message };
    }
}
