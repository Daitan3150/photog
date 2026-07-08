'use server';

import { revalidatePath } from 'next/cache';

export interface Subject {
    id: string;
    name: string;
    modelId?: string;
    snsUrl?: string;
    notes?: string;
    realName?: string;
    showRealName?: boolean;
    birthday?: string;
    birthYear?: string;
    birthMonth?: string;
    birthDay?: string;
    approximateAge?: string;
    showBirthYear?: boolean;
    showAge?: boolean;
    ageDisplayMode?: 'blurred' | 'formal';
    deceasedDate?: string;
    deceasedYear?: string;
    deceasedMonth?: string;
    deceasedDay?: string;
    createdAt?: string;
}

export interface SubjectFormData {
    name: string;
    modelId?: string;
    snsUrl?: string;
    notes?: string;
    realName?: string;
    showRealName?: boolean;
    birthday?: string;
    birthYear?: string;
    birthMonth?: string;
    birthDay?: string;
    approximateAge?: string;
    showBirthYear?: boolean;
    showAge?: boolean;
    ageDisplayMode?: 'blurred' | 'formal';
    deceasedDate?: string;
    deceasedYear?: string;
    deceasedMonth?: string;
    deceasedDay?: string;
}

const COLLECTION_NAME = 'subjects';

export async function getSubjects() {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        const snapshot = await db.collection(COLLECTION_NAME).orderBy('name', 'asc').get();

        return {
            success: true,
            data: snapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    name: d.name || '',
                    snsUrl: d.snsUrl || '',
                    notes: d.notes || '',
                    realName: d.realName || '',
                    showRealName: d.showRealName === true,
                    birthday: d.birthday || '',
                    birthYear: d.birthYear || '',
                    birthMonth: d.birthMonth || '',
                    birthDay: d.birthDay || '',
                    modelId: d.modelId || '',
                    approximateAge: d.approximateAge || '',
                    showBirthYear: d.showBirthYear === true,
                    showAge: d.showAge !== false,
                    ageDisplayMode: d.ageDisplayMode || 'blurred',
                    deceasedDate: d.deceasedDate || '',
                    deceasedYear: d.deceasedYear || '',
                    deceasedMonth: d.deceasedMonth || '',
                    deceasedDay: d.deceasedDay || '',
                    createdAt: d.createdAt?.toDate?.()?.toISOString() ?? d.createdAt ?? '',
                    updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? d.updatedAt ?? '',
                };
            }) as Subject[]
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
            modelId: data.modelId || null,
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
            ...(data.modelId !== undefined ? { modelId: data.modelId || null } : {}),
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
