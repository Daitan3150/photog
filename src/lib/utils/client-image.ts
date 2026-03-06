/**
 * Client-side image resizing utility to prevent large file upload failures.
 * Uses createImageBitmap + OffscreenCanvas when available for better memory efficiency.
 * Falls back to FileReader + Canvas for older browsers.
 */

/**
 * リサイズ済みBlobを返す。
 * maxWidth/maxHeight 以下に縮小し、JPEG に変換。
 * 元画像が既に十分小さい場合はそのまま返す。
 */
export async function resizeImageClient(
    file: File,
    maxWidth: number = 2500,
    maxHeight: number = 2500,
    quality: number = 0.82
): Promise<Blob> {
    // 🚀 Instagram/Twitterと同等の「Web Worker 背景処理」によるフリーズ防止
    // 対応ブラウザ（Chrome/Edge, Safari 16.4+等）では別スレッドで処理してUIの停止を防ぐ
    if (typeof window !== 'undefined' && window.Worker && typeof OffscreenCanvas !== 'undefined') {
        try {
            return await new Promise((resolve, reject) => {
                const workerCode = `
                    self.onmessage = async (e) => {
                        try {
                            const { file, maxWidth, maxHeight, quality } = e.data;
                            const bitmap = await self.createImageBitmap(file);
                            
                            let width = bitmap.width;
                            let height = bitmap.height;
                            if (width > maxWidth || height > maxHeight) {
                                const ratio = Math.min(maxWidth / width, maxHeight / height);
                                width = Math.round(width * ratio);
                                height = Math.round(height * ratio);
                            }

                            // 既に十分小さければそのまま返す
                            if (width === bitmap.width && height === bitmap.height && file.type === 'image/jpeg' && file.size < 4 * 1024 * 1024) {
                                self.postMessage({ type: 'success', blob: file });
                                bitmap.close();
                                return;
                            }

                            const canvas = new OffscreenCanvas(width, height);
                            const ctx = canvas.getContext('2d');
                            if (!ctx) throw new Error('OffscreenCanvas context failed');
                            ctx.drawImage(bitmap, 0, 0, width, height);
                            bitmap.close();
                            
                            const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
                            self.postMessage({ type: 'success', blob });
                        } catch (err) {
                            self.postMessage({ type: 'error', error: err.message });
                        }
                    };
                `;
                const blob = new Blob([workerCode], { type: 'application/javascript' });
                const workerUrl = URL.createObjectURL(blob);
                const worker = new Worker(workerUrl);

                worker.onmessage = (e) => {
                    URL.revokeObjectURL(workerUrl);
                    if (e.data.type === 'error') {
                        reject(new Error(e.data.error));
                    } else {
                        resolve(e.data.blob);
                    }
                    worker.terminate();
                };

                worker.onerror = (err) => {
                    URL.revokeObjectURL(workerUrl);
                    reject(new Error(err.message));
                    worker.terminate();
                };

                worker.postMessage({ file, maxWidth, maxHeight, quality });
            });
        } catch (workerErr) {
            console.warn('Web Worker resizing failed, falling back to main thread...', workerErr);
            // 失敗時はメインスレッドにフォールバック（下へ続く）
        }
    }

    // ① メインスレッドでのフォールバック (createImageBitmap)
    if (typeof createImageBitmap === 'function') {
        try {
            const bitmap = await createImageBitmap(file);
            const { width, height } = calcDimensions(bitmap.width, bitmap.height, maxWidth, maxHeight);

            // 既に小さい & JPEGで、サイズが4MB以下ならリサイズ不要
            if (width === bitmap.width && height === bitmap.height && file.type === 'image/jpeg' && file.size < 4 * 1024 * 1024) {
                bitmap.close();
                return file;
            }

            // OffscreenCanvas
            if (typeof OffscreenCanvas !== 'undefined') {
                const canvas = new OffscreenCanvas(width, height);
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(bitmap, 0, 0, width, height);
                    bitmap.close();
                    return await canvas.convertToBlob({ type: 'image/jpeg', quality });
                }
            }

            // Normal Canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context failed');
            ctx.drawImage(bitmap, 0, 0, width, height);
            bitmap.close();

            return await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (blob) => blob ? resolve(blob) : reject(new Error('Canvas to Blob failed')),
                    'image/jpeg',
                    quality
                );
            });
        } catch (e) {
            console.warn('createImageBitmap main-thread path failed, using fallback:', e);
        }
    }

    // ② 最終手段: FileReader + Image + Canvas
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const { width, height } = calcDimensions(img.width, img.height, maxWidth, maxHeight);
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('Canvas context failed')); return; }
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => blob ? resolve(blob) : reject(new Error('Canvas to Blob failed')),
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

/** アスペクト比を維持した縮小後のサイズを計算 */
function calcDimensions(
    origWidth: number, origHeight: number,
    maxWidth: number, maxHeight: number
): { width: number; height: number } {
    let width = origWidth;
    let height = origHeight;
    if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
    }
    return { width, height };
}
