/**
 * 🧠 記憶 (Memory): Cloudflare KV Cache Client
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
    const workerUrl = process.env.CLOUDFLARE_WORKER_URL;
    const authToken = process.env.WORKER_AUTH_TOKEN;

    if (!workerUrl || !authToken) return null;

    try {
        const res = await fetch(`${workerUrl}/cache?key=${encodeURIComponent(key)}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            next: { revalidate: 60 } // Next.js level cache for 1 minute
        });

        if (res.ok) {
            return await res.json() as T;
        }
    } catch (error) {
        console.error(`[Cache GET Error] key=${key}:`, error);
    }
    return null;
}

export async function setCachedData(key: string, data: any): Promise<boolean> {
    const workerUrl = process.env.CLOUDFLARE_WORKER_URL;
    const authToken = process.env.WORKER_AUTH_TOKEN;

    if (!workerUrl || !authToken) return false;

    try {
        const res = await fetch(`${workerUrl}/cache?key=${encodeURIComponent(key)}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        return res.ok;
    } catch (error) {
        console.error(`[Cache SET Error] key=${key}:`, error);
        return false;
    }
}
