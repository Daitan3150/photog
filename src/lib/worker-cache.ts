import { kv } from '@vercel/kv';
import { revalidatePath } from 'next/cache';

/**
 * 🧠 記憶 (Memory): Vercel KV (Redis) Cache Client
 * Vercel 移行に伴い、爆速な Redis ベースのキャッシュに切り替えています。
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return null;
    }
    try {
        const data = await kv.get<T>(key);
        return data;
    } catch (error) {
        console.error(`[Cache GET Error] key=${key}:`, error);
        return null;
    }
}

const CATEGORIES = ['all', 'portrait', 'snapshot', 'cosplay', 'landscape', 'animal', 'other'];

async function purgePublicCache() {
    try {
        // 基本のキャッシュ
        await clearCachedData('public_photos');
        await clearCachedData('public_photos_for_search');

        // バージョン付き各カテゴリーのキャッシュをすべてクリア
        await Promise.all(CATEGORIES.map(cat => clearCachedData(`public_photos_v2_${cat}`)));

        console.log('[Cache Purge] All public photo caches cleared.');
    } catch (e) {
        console.error('[Cache Purge Error]', e);
    }
}

export async function setCachedData(key: string, data: any, ttlSeconds: number = 3600): Promise<boolean> {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return false;
    }
    try {
        await kv.set(key, data, { ex: ttlSeconds });
        revalidatePath('/');
        revalidatePath('/portfolio');
        revalidatePath('/search');
        // --- 🧠 記憶 (Memory): キャッシュ完全破棄 ---
        await purgePublicCache();
        return true;
    } catch (error) {
        console.error(`[Cache SET Error] key=${key}:`, error);
        return false;
    }
}

export async function clearCachedData(key: string): Promise<boolean> {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return false;
    }
    try {
        await kv.del(key);
        return true;
    } catch (error) {
        console.error(`[Cache DEL Error] key=${key}:`, error);
        return false;
    }
}

/**
 * 直接エクスポートして使えるようにします
 */
export const cache = {
    get: getCachedData,
    set: setCachedData,
};
