'use server';

import { Studio, StudioFormData } from '@/types/studio';
import { revalidatePath } from 'next/cache';
import { serializeData } from '../utils/serialization';

/**
 * スタジオ一覧を取得する
 */
export async function getStudios(idToken?: string): Promise<Studio[]> {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        const snapshot = await db.collection('studios').orderBy('name', 'asc').get();

        const studios = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || null,
            updatedAt: doc.data().updatedAt?.toDate() || null,
        })) as Studio[];

        return serializeData(studios);
    } catch (error) {
        console.error('Error getting studios:', error);
        return [];
    }
}

/**
 * スタジオを保存（新規作成）する
 */
export async function saveStudio(data: StudioFormData, idToken: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        await auth.verifyIdToken(idToken); // 認証チェック

        const db = getAdminFirestore();
        const studioRef = db.collection('studios').doc();

        const newStudio = {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await studioRef.set(newStudio);

        revalidatePath('/admin/studios');
        return { success: true, id: studioRef.id };
    } catch (error: any) {
        console.error('Error saving studio:', error);
        return { success: false, error: error.message };
    }
}

/**
 * スタジオを更新する
 */
export async function updateStudio(id: string, data: Partial<StudioFormData>, idToken: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        await auth.verifyIdToken(idToken); // 認証チェック

        const db = getAdminFirestore();
        const studioRef = db.collection('studios').doc(id);

        await studioRef.update({
            ...data,
            updatedAt: new Date(),
        });

        revalidatePath('/admin/studios');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating studio:', error);
        return { success: false, error: error.message };
    }
}

/**
 * スタジオを削除する
 */
export async function deleteStudio(id: string, idToken: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        await auth.verifyIdToken(idToken); // 認証チェック

        const db = getAdminFirestore();
        await db.collection('studios').doc(id).delete();

        revalidatePath('/admin/studios');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting studio:', error);
        return { success: false, error: error.message };
    }
}
