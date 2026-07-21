'use server';

import { Location, LocationFormData } from '@/types/location';
import { revalidatePath, unstable_noStore } from 'next/cache';
import { serializeData } from '../utils/serialization';
import { getCachedData, setCachedData, clearCachedData } from '@/lib/worker-cache';

/**
 * ロケーション一覧を取得する
 */
export async function getLocations(idToken?: string): Promise<Location[]> {
    try {
        unstable_noStore();
        const cacheKey = 'locations_list';
        const cached = await getCachedData<Location[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        const snapshot = await db.collection('locations').orderBy('name', 'asc').get();

        const locations = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || null,
            updatedAt: doc.data().updatedAt?.toDate() || null,
        })) as Location[];

        await setCachedData('locations_list', locations, 3600);
        return serializeData(locations);
    } catch (error) {
        console.error('Error getting locations:', error);
        return [];
    }
}

/**
 * ロケーションが未登録なら自動で作成する
 */
export async function ensureLocationExists(locationName: string, data: Partial<LocationFormData> = {}) {
    try {
        const trimmedName = locationName?.trim();
        if (!trimmedName) {
            return { success: true, exists: true };
        }

        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        const normalizedName = trimmedName.toLowerCase();
        const querySnapshot = await db.collection('locations').where('name', '==', trimmedName).limit(1).get();
        const existingDoc = !querySnapshot.empty ? querySnapshot.docs[0] : null;

        if (existingDoc) {
            return { success: true, exists: true, id: existingDoc.id };
        }

        const newLocation = {
            name: trimmedName,
            type: data.type || 'other',
            note: data.note || '',
            address: data.address || '',
            addressZip: data.addressZip || '',
            addressPref: data.addressPref || '',
            addressCity: data.addressCity || '',
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const ref = await db.collection('locations').add(newLocation);

        await clearCachedData('locations_list');
        revalidatePath('/admin/locations');
        revalidatePath('/admin/studios');
        revalidatePath('/admin/photos/new');
        return { success: true, exists: false, id: ref.id };
    } catch (error: any) {
        console.error('Error ensuring location exists:', error);
        return { success: false, error: error.message };
    }
}

/**
 * ロケーションを保存（新規作成）
 */
export async function saveLocation(data: LocationFormData, idToken: string) {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        await auth.verifyIdToken(idToken);

        const db = getAdminFirestore();
        const ref = db.collection('locations').doc();

        const newLocation = {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await ref.set(newLocation);
        await clearCachedData('locations_list');

        revalidatePath('/admin/locations');
        revalidatePath('/admin/studios');
        revalidatePath('/admin/photos/new');
        return { success: true, id: ref.id };
    } catch (error: any) {
        console.error('Error saving location:', error);
        return { success: false, error: error.message };
    }
}

/**
 * ロケーションを更新
 */
export async function updateLocation(id: string, data: Partial<LocationFormData>, idToken: string) {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        await auth.verifyIdToken(idToken);

        const db = getAdminFirestore();
        const ref = db.collection('locations').doc(id);

        await ref.update({
            ...data,
            updatedAt: new Date(),
        });

        revalidatePath('/admin/locations');
        revalidatePath('/admin/studios');
        revalidatePath('/admin/photos/new');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating location:', error);
        return { success: false, error: error.message };
    }
}

/**
 * ロケーションを削除
 */
export async function deleteLocation(id: string, idToken: string) {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        await auth.verifyIdToken(idToken);

        const db = getAdminFirestore();
        await db.collection('locations').doc(id).delete();

        revalidatePath('/admin/locations');
        revalidatePath('/admin/studios');
        revalidatePath('/admin/photos/new');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting location:', error);
        return { success: false, error: error.message };
    }
}
