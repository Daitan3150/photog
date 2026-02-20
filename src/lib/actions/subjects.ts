'use server';

import { revalidatePath } from 'next/cache';

export interface Subject {
    id: string;
    name: string;
    snsUrl?: string;
    notes?: string;
    createdAt?: string;
}

export interface SubjectFormData {
    name: string;
    snsUrl?: string;
    notes?: string;
}

const COLLECTION_NAME = 'subjects';

export async function getSubjects() {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        const snapshot = await db.collection(COLLECTION_NAME).orderBy('name', 'asc').get();

        return {
            success: true,
            data: snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
            })) as Subject[]
        };
    } catch (error: any) {
        console.error('Error fetching subjects:', error);
        return { success: false, data: [], error: error.message };
    }
}

export async function saveSubject(data: SubjectFormData) {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        // Check if name already exists (optional, but good for consistency)
        const existing = await db.collection(COLLECTION_NAME).where('name', '==', data.name).get();
        if (!existing.empty) {
            // If exists, we could return error or just update. Let's return error for explicit management.
            return { success: false, error: 'この名前のモデルは既に登録されています。' };
        }

        const docRef = await db.collection(COLLECTION_NAME).add({
            ...data,
            createdAt: new Date(),
        });

        revalidatePath('/admin/subjects');
        return { success: true, id: docRef.id };
    } catch (error: any) {
        console.error('Error saving subject:', error);
        return { success: false, error: error.message };
    }
}

export async function updateSubject(id: string, data: Partial<SubjectFormData>) {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        await db.collection(COLLECTION_NAME).doc(id).update({
            ...data,
            updatedAt: new Date(),
        });

        revalidatePath('/admin/subjects');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating subject:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteSubject(id: string) {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        await db.collection(COLLECTION_NAME).doc(id).delete();

        revalidatePath('/admin/subjects');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting subject:', error);
        return { success: false, error: error.message };
    }
}
