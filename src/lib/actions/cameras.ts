'use server';

import { Camera, CameraFormData } from '@/types/camera';
import { revalidatePath, unstable_noStore } from 'next/cache';
import { serializeData } from '../utils/serialization';
import { inferCameraType } from '../photos/inferCameraType';
import { getCachedData, setCachedData, clearCachedData } from '@/lib/worker-cache';

/**
 * すべてのカメラデータを取得する（未登録のものも含む）
 */
export async function getCameras(): Promise<Camera[]> {
    try {
        unstable_noStore();
        const cacheKey = 'cameras_list';
        const cached = await getCachedData<Camera[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        // 登録日の新しい順、または名前順でソート
        const snapshot = await db.collection('cameras').orderBy('name', 'asc').get();

        const cameras = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || null,
            updatedAt: doc.data().updatedAt?.toDate() || null,
        })) as Camera[];

        await setCachedData('cameras_list', cameras, 3600);
        return serializeData(cameras);
    } catch (error) {
        console.error('Error getting cameras:', error);
        return [];
    }
}

/**
 * カメラを新規登録する
 */
export async function saveCamera(data: CameraFormData, idToken: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        await auth.verifyIdToken(idToken); // 管理者認証チェック

        const db = getAdminFirestore();
        const cameraRef = db.collection('cameras').doc();

        const newCamera = {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await cameraRef.set(newCamera);
        await clearCachedData('cameras_list');

        revalidatePath('/admin/cameras');
        revalidatePath('/admin/photos/new');
        revalidatePath('/admin/photos/[id]');
        return { success: true, id: cameraRef.id };
    } catch (error: any) {
        console.error('Error saving camera:', error);
        return { success: false, error: error.message };
    }
}

/**
 * カメラ情報を更新する（登録完了時は isRegistered = true にする）
 */
export async function updateCamera(id: string, data: Partial<CameraFormData>, idToken: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        await auth.verifyIdToken(idToken);

        const db = getAdminFirestore();
        const cameraRef = db.collection('cameras').doc(id);

        await cameraRef.update({
            ...data,
            updatedAt: new Date(),
        });

        revalidatePath('/admin/cameras');
        revalidatePath('/admin/photos/new');
        revalidatePath('/admin/photos/[id]');
        revalidatePath('/portfolio');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating camera:', error);
        return { success: false, error: error.message };
    }
}

/**
 * カメラを削除する
 */
export async function deleteCamera(id: string, idToken: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        await auth.verifyIdToken(idToken);

        const db = getAdminFirestore();
        await db.collection('cameras').doc(id).delete();
        await clearCachedData('cameras_list');

        revalidatePath('/admin/cameras');
        revalidatePath('/admin/photos/new');
        revalidatePath('/admin/photos/[id]');
        revalidatePath('/portfolio');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting camera:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 写真アップロード時等に呼び出され、カメラ型番が未登録なら自動で仮登録する
 */
export async function ensureCameraExists(modelName: string, makeName: string = ''): Promise<{ success: boolean; camera?: Camera; error?: string }> {
    try {
        const trimmedName = modelName?.trim();
        if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 80) {
            return { success: false, error: 'Invalid camera model name length' };
        }

        // 不適切な文字列（パースエラー残骸など）を除外
        const junkPatterns = ['undefined', 'null', '[object object]', 'unknown'];
        if (junkPatterns.includes(trimmedName.toLowerCase())) {
            return { success: false, error: 'Invalid camera model name string' };
        }


        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        const normalizedName = trimmedName.toLowerCase();
        
        // 既存のカメラをスキャンして一致するものを探す (名前完全一致、大文字小文字無視)
        const snapshot = await db.collection('cameras').get();
        const existingDoc = snapshot.docs.find(doc => String(doc.data().name || '').trim().toLowerCase() === normalizedName);

        if (existingDoc) {
            const camera = {
                id: existingDoc.id,
                ...existingDoc.data(),
                createdAt: existingDoc.data().createdAt?.toDate() || null,
                updatedAt: existingDoc.data().updatedAt?.toDate() || null,
            } as Camera;
            return { success: true, camera: serializeData(camera) };
        }

        // 存在しない場合、一時的な未登録 (isRegistered = false) データとして作成
        const inferredType = inferCameraType(trimmedName, makeName);
        const newCamera = {
            make: makeName.trim() || 'Generic',
            name: trimmedName,
            type: inferredType,
            sensorSize: '未設定', // ユーザーが後から登録する
            releasedYear: null,
            isRegistered: false, // 未登録状態
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const ref = await db.collection('cameras').add(newCamera);
        
        revalidatePath('/admin/cameras');
        
        const createdCamera = {
            id: ref.id,
            ...newCamera
        } as Camera;

        return { success: true, camera: serializeData(createdCamera) };
    } catch (error: any) {
        console.error('Error ensuring camera exists:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 🔀 未登録カメラを既存の正式登録済みカメラに統合する
 * @param sourceCameraId 統合元（未登録）カメラのID
 * @param targetCameraId 統合先（正式登録済み）カメラのID
 * @param idToken 管理者トークン
 */
export async function mergeCameras(
    sourceCameraId: string,
    targetCameraId: string,
    idToken: string
): Promise<{ success: boolean; updatedCount?: number; error?: string }> {
    try {
        if (!sourceCameraId || !targetCameraId || sourceCameraId === targetCameraId) {
            return { success: false, error: 'Invalid camera IDs' };
        }

        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        await auth.verifyIdToken(idToken);

        const db = getAdminFirestore();

        // 統合先カメラの存在確認
        const targetDoc = await db.collection('cameras').doc(targetCameraId).get();
        if (!targetDoc.exists) {
            return { success: false, error: 'Target camera not found' };
        }
        const targetCamera = targetDoc.data();

        // 統合元の写真を取得
        const photosSnapshot = await db.collection('photos').where('cameraId', '==', sourceCameraId).get();

        const batch = db.batch();
        let count = 0;

        photosSnapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
                cameraId: targetCameraId,
                cameraType: targetCamera?.type || null,
                updatedAt: new Date(),
            });
            count++;
        });

        // 統合元の未登録カメラデータを削除
        const sourceRef = db.collection('cameras').doc(sourceCameraId);
        batch.delete(sourceRef);

        await batch.commit();
        await clearCachedData('cameras_list');

        revalidatePath('/admin/cameras');
        revalidatePath('/admin/photos/new');
        revalidatePath('/admin/photos/[id]');
        revalidatePath('/portfolio');

        return { success: true, updatedCount: count };
    } catch (error: any) {
        console.error('Error merging cameras:', error);
        return { success: false, error: error.message };
    }
}

