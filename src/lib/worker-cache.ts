import { kv } from '@vercel/kv';

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

export async function setCachedData(key: string, data: any, ttlSeconds: number = 3600): Promise<boolean> {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return false;
    }
    try {
        await kv.set(key, data, { ex: ttlSeconds });
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
    clear: clearCachedData,
};
