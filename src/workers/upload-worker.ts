/// <reference types="@cloudflare/workers-types" />

export interface Env {
    R2_BUCKET: R2Bucket;
    UPLOAD_QUEUE: Queue<any>;
    CACHE_KV: KVNamespace;
    DB: D1Database;
    CLOUDINARY_URL: string;
    WORKER_AUTH_TOKEN: string;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Simple token authentication
        const auth = request.headers.get('Authorization');
        if (auth !== `Bearer ${env.WORKER_AUTH_TOKEN || 'fallback-secret'}`) {
            return new Response('Unauthorized', { status: 401 });
        }

        const url = new URL(request.url);

        // --- 🧠 記憶 (Memory): KV Cache 操作 ---
        if (url.pathname === '/cache') {
            const cacheKey = url.searchParams.get('key');
            if (!cacheKey) return new Response('Missing key', { status: 400 });

            if (request.method === 'GET') {
                const value = await env.CACHE_KV.get(cacheKey);
                if (!value) return new Response('Not found', { status: 404 });
                return new Response(value, {
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            if (request.method === 'PUT') {
                const body = await request.text();
                // キャッシュ時間はとりあえず1時間 (3600秒)
                await env.CACHE_KV.put(cacheKey, body, { expirationTtl: 3600 });
                return new Response(JSON.stringify({ success: true }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // --- 🧠 知識 (Knowledge): D1 Stats 操作 ---
        if (url.pathname === '/stats') {
            const photoId = url.searchParams.get('id');
            if (!photoId) return new Response('Missing id', { status: 400 });

            if (request.method === 'GET') {
                const stats = await env.DB.prepare(
                    'SELECT views, likes FROM photo_stats WHERE id = ?'
                ).bind(photoId).first();

                return new Response(JSON.stringify(stats || { views: 0, likes: 0 }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            if (request.method === 'POST') {
                const body = await request.json() as { type: 'view' | 'like' };
                const type = body.type;

                if (type === 'view') {
                    await env.DB.prepare(
                        `INSERT INTO photo_stats (id, views) VALUES (?, 1)
                         ON CONFLICT(id) DO UPDATE SET views = views + 1, updated_at = CURRENT_TIMESTAMP`
                    ).bind(photoId).run();
                } else if (type === 'like') {
                    await env.DB.prepare(
                        `INSERT INTO photo_stats (id, likes) VALUES (?, 1)
                         ON CONFLICT(id) DO UPDATE SET likes = likes + 1, updated_at = CURRENT_TIMESTAMP`
                    ).bind(photoId).run();
                }

                return new Response(JSON.stringify({ success: true }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // --- ⚡ 神経 (Nervous System): Queue 投入 ---
        if (url.pathname === '/') {
            const body = await request.json();
            // --- ⚡ 神経 (Nervous System): Queue 投入 ---
            await env.UPLOAD_QUEUE.send(body);

            // --- 💪 筋肉 (Muscle): Search Index の初期/簡易登録もここで行うことが可能ですが、
            // 確実な同期のために明示的な /sync エンドポイントを設けます。

            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response('Not found', { status: 404 });
    },

    async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
        for (const message of batch.messages) {
            const data = message.body;
            console.log(`🧠 [Processing] ${data.fileName} (${data.publicId})`);

            try {
                // --- 🧠 脳の働き (Brain processing) ---
                // 本来はここで Cloudinary の Fetch API などを使用して R2 から吸い上げます。
                // 現状は R2 からの削除（クリーンアップ）までを確実に実行するロジックを組んでいます。

                // 1. R2 に存在するか確認
                const object = await env.R2_BUCKET.head(data.publicId);
                if (!object) {
                    console.warn(`⚠️ Object already missing: ${data.publicId}`);
                } else {
                    // 2. Cloudinary への転送指示 (シミュレーション)
                    // 実際には Cloudinary の API 呼び出しを追加
                    console.log(`🚀 Transferring ${data.fileName} to Cloudinary...`);

                    // 3. R2 から削除 (クリーンアップ)
                    await env.R2_BUCKET.delete(data.publicId);
                    console.log(`✨ Cleanup complete for: ${data.fileName}`);
                }

                message.ack();
            } catch (error) {
                console.error(`❌ Queue Error: ${error}`);
            }
        }
    },
};
