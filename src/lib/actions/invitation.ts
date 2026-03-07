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

export async function checkInvitationCode(code: string) {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        const snapshot = await db.collection('invitation_codes')
            .where('code', '==', code.toUpperCase())
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { success: false, error: '招待コードが見つかりません。' };
        }

        const data = snapshot.docs[0].data();
        if (data.isUsed) {
            return { success: false, error: 'この招待コードは既に使用されています。' };
        }

        return { success: true, code: data.code };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteInvitationCode(id: string) {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        const docRef = db.collection('invitation_codes').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { success: false, error: '招待コードが見つかりません。' };
        }

        const data = doc.data();
        if (data?.isUsed) {
            return { success: false, error: '既に使用されたコードは削除できません。' };
        }

        await docRef.delete();
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting invitation code:', error);
        return { success: false, error: error.message };
    }
}
