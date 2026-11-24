import 'server-only';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebaseAdmin';

export const SUPER_ADMIN_EMAILS = [
    'daitan10618@icloud.com',
    'daitan10618@gmail.com',
    'new.sasuke.sakura@gmail.com',
];

export interface VerifiedAdminUser {
    uid: string;
    email: string;
    isSuperAdmin: boolean;
}

/**
 * 渡された Firebase ID トークンを検証し、リクエスト元が管理者であることを確認します。
 */
export async function verifyAdminSession(idToken: string): Promise<VerifiedAdminUser> {
    if (!idToken || typeof idToken !== 'string') {
        throw new Error('認証トークンが指定されていないか無効です。');
    }

    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    const email = decodedToken.email || '';
    const uid = decodedToken.uid;

    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(email);
    if (isSuperAdmin) {
        return { uid, email, isSuperAdmin: true };
    }

    // Firestore上のroleを確認
    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        throw new Error('管理者権限が必要です。');
    }

    return { uid, email, isSuperAdmin: false };
}
