/**
 * 🧠 知識 (Knowledge): Cloudflare D1 Stats Client
 */

export interface PhotoStats {
    views: number;
    likes: number;
}

export async function getPhotoStats(photoId: string): Promise<PhotoStats> {
    const workerUrl = process.env.CLOUDFLARE_WORKER_URL;
    const authToken = process.env.WORKER_AUTH_TOKEN;

    if (!workerUrl || !authToken) return { views: 0, likes: 0 };

    try {
        const res = await fetch(`${workerUrl}/stats?id=${encodeURIComponent(photoId)}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            next: { revalidate: 30 } // 30秒キャッシュ
        });

        if (res.ok) {
            return await res.json() as PhotoStats;
        }
    } catch (error) {
        console.error(`[Stats GET Error] id=${photoId}:`, error);
    }
    return { views: 0, likes: 0 };
}

export async function incrementPhotoStats(photoId: string, type: 'view' | 'like'): Promise<boolean> {
    const workerUrl = process.env.CLOUDFLARE_WORKER_URL;
    const authToken = process.env.WORKER_AUTH_TOKEN;

    if (!workerUrl || !authToken) return false;

    try {
        const res = await fetch(`${workerUrl}/stats?id=${encodeURIComponent(photoId)}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type })
        });

        return res.ok;
    } catch (error) {
        console.error(`[Stats POST Error] id=${photoId}:`, error);
        return false;
    }
}
