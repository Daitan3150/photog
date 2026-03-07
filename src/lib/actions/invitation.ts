'use server';

// Removed top-level import to prevent client-side leak
import * as crypto from 'crypto';

interface CreateInvitationResult {
    success: boolean;
    code?: string;
    error?: string;
}

// Authorized Super Admin Emails
const SUPER_ADMIN_EMAILS = ['daitan10618@icloud.com', 'daitan10618@gmail.com', 'new.sasuke.sakura@gmail.com'];

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

        return snapshot.docs.map((doc: any) => ({
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

export async function deleteInvitationCode(id: string, idToken: string) {
    try {
        const { getAdminFirestore, getAdminAuth } = await import('@/lib/firebaseAdmin');

        // Authorization check
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        if (!SUPER_ADMIN_EMAILS.includes(decodedToken.email || '')) {
            return { success: false, error: '権限がありません。最上位管理者のみ実行可能です。' };
        }

        const db = getAdminFirestore();
        const docRef = db.collection('invitation_codes').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { success: false, error: '招待コードが見つかりません。' };
        }

        const data: any = doc.data();
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

/**
 * [最高管理者限定] ユーザーの削除
 */
export async function removeUser(uid: string, idToken: string) {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();

        // Authorization check
        const decodedToken = await auth.verifyIdToken(idToken);
        if (!SUPER_ADMIN_EMAILS.includes(decodedToken.email || '')) {
            return { success: false, error: '権限がありません。最上位管理者のみ実行可能です。' };
        }

        if (uid === decodedToken.uid) {
            return { success: false, error: '自分自身を削除することはできません。' };
        }

        // 1. Delete from Firebase Auth
        await auth.deleteUser(uid);

        // 2. Delete from Firestore 'users'
        const db = getAdminFirestore();
        await db.collection('users').doc(uid).delete();

        // 3. Mark photos as anonymous or delete? (Usually safer to anonymize or keep for history)
        // For now, we just leave them or you can add logic to delete them if needed.

        console.log(`[Admin Action] User ${uid} removed by ${decodedToken.email}`);
        return { success: true };
    } catch (error: any) {
        console.error('Error removing user:', error);
        return { success: false, error: error.message };
    }
}
