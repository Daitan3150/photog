'use server';

// Removed top-level import to prevent client-side leak
import * as crypto from 'crypto';

interface CreateInvitationResult {
    success: boolean;
    code?: string;
    error?: string;
}

export async function createInvitationCode(): Promise<CreateInvitationResult> {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        // Generate a random 8-character alphanumeric code
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();

        await db.collection('invitation_codes').add({
            code,
            isUsed: false,
            createdAt: new Date().toISOString(),
        });

        return { success: true, code };
    } catch (error: any) {
        console.error('Error creating invitation code:', error);
        return { success: false, error: error.message };
    }
}

export async function getInvitationCodes() {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        const snapshot = await db.collection('invitation_codes')
            .orderBy('createdAt', 'desc')
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as { id: string; code: string; isUsed: boolean; createdAt: string; usedBy?: string }[];
    } catch (error) {
        console.error('Error fetching invitation codes:', error);
        return [];
    }
}
