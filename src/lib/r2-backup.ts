/**
 * Worker 経由で元画像を R2 にバックアップする（ベストエフォート）
 * 失敗してもアップロード本体は続行する
 */
export async function backupToR2(
    buffer: Buffer,
    filename: string,
    publicId: string,
    contentType: string,
    idToken: string
): Promise<string | null> {
    const workerUrl = process.env.WORKER_URL || 'https://worker.daitan-portfolio.workers.dev';
    const key = `originals/${publicId.replace(/\//g, '_')}_${filename}`;

    try {
        const fd = new FormData();
        fd.append('file', new Blob([new Uint8Array(buffer)], { type: contentType }), filename);
        fd.append('key', key);

        const res = await fetch(`${workerUrl}/api/r2/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
            body: fd,
        });

        if (!res.ok) {
            const err = await res.text();
            console.warn(`[R2 Backup] Failed (${res.status}): ${err}`);
            return null;
        }

        console.log(`[R2 Backup] Saved: ${key}`);
        return key;
    } catch (e) {
        console.warn('[R2 Backup] Error:', e);
        return null;
    }
}
