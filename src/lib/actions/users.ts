'use server';

// Removed top-level import to prevent client-side leak
// Removed top-level firebase-admin imports to fix client-side leaks

export type SnsLink = {
    type: 'X' | 'Instagram' | 'TikTok' | 'YouTube' | 'Threads' | 'Other';
    value: string; // Can be URL or ID
};

export type UserData = {
    uid: string;
    email: string;
    displayName: string;
    modelId?: string;
    photoURL?: string;
    description?: string; // Profile description
    snsLinks?: SnsLink[];
    photoCount: number;
    createdAt: string;
    lastLoginAt?: string;
};

export async function getUsers(): Promise<{ success: boolean; users?: UserData[]; error?: string }> {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const adminAuth = getAdminAuth();
        const adminDb = getAdminFirestore();

        // 1. List all users from Firebase Auth
        const listUsersResult = await adminAuth.listUsers(100); // Limit to 100 for now
        const authUsers = listUsersResult.users;

        // 2. Fetch additional data from Firestore 'users' collection
        const usersRef = adminDb.collection('users');
        const snapshot = await usersRef.get();
        const firestoreDataMap = new Map();

        snapshot.docs.forEach((doc: any) => {
            firestoreDataMap.set(doc.id, doc.data());
        });

        // 3. Aggregate photo counts (This might be expensive, optimize later if needed)
        // For now, simple count query for each user or fetch all photos and aggregate?
        // Better: Fetch all photos once and aggregate in memory if dataset is small, 
        // or execute separate count queries (N+1 problem risk).
        // Let's use a count query for each user for accuracy for now, assuming low user count.
        // Actually, listing all photos and counting by uploaderId is better if we have index.
        // Actually, listing all photos and counting by uploaderId is better if we have index.
        const photosSnapshot = await adminDb.collection('photos').get(); // Get ALL photos (careful with size)
        const photoCounts = new Map<string, number>();

        photosSnapshot.docs.forEach((doc: any) => {
            const data = doc.data();
            if (data.uploaderId) {
                photoCounts.set(data.uploaderId, (photoCounts.get(data.uploaderId) || 0) + 1);
            }
        });

        // 4. Merge data
        const users: UserData[] = authUsers.map((user: any) => {
            const firestoreData = firestoreDataMap.get(user.uid) || {};

            return {
                uid: user.uid,
                email: user.email || '',
                displayName: firestoreData.displayName || user.displayName || 'No Name',
                modelId: firestoreData.modelId || '',
                photoURL: firestoreData.photoURL || user.photoURL || '',
                description: firestoreData.description || '',
                snsLinks: firestoreData.snsLinks || [],
                photoCount: photoCounts.get(user.uid) || 0,
                createdAt: user.metadata.creationTime,
                lastLoginAt: user.metadata.lastSignInTime,
            };
        });

        return { success: true, users };
    } catch (error) {
        console.error('Error fetching users:', error);
        return { success: false, error: 'Failed to fetch users' };
    }
}

export async function getMyProfile(idToken: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const db = getAdminFirestore();

        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists) {
            return { success: false, error: 'User not found' };
        }

        return { success: true, data: userDoc.data() };
    } catch (error: any) {
        console.error('Error fetching my profile:', error);
        return { success: false, error: error.message };
    }
}

export async function updateMySnsLinks(snsLinks: SnsLink[], idToken: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const db = getAdminFirestore();

        await db.collection('users').doc(decodedToken.uid).update({
            snsLinks,
            updatedAt: new Date().toISOString()
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error updating SNS links:', error);
        return { success: false, error: error.message };
    }
}

export async function getAllSnsCandidates(): Promise<{ success: boolean; candidates: string[] }> {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        const snapshot = await db.collection('users').get();

        const candidates = new Set<string>();
        snapshot.docs.forEach((doc: any) => {
            const data = doc.data();
            if (data.snsLinks && Array.isArray(data.snsLinks)) {
                data.snsLinks.forEach((link: SnsLink) => {
                    if (link.value) candidates.add(link.value);
                });
            }
        });

        return { success: true, candidates: Array.from(candidates) };
    } catch (error) {
        console.error('Error fetching SNS candidates:', error);
        return { success: false, candidates: [] };
    }
}

/**
 * 管理者が指定したユーザーのパスワードを強制変更するためのサーバーアクション。
 */
export async function adminResetUserPassword(uid: string, newPassword: string) {
    try {
        const { getAdminAuth } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();

        if (!uid || !newPassword || newPassword.length < 8) {
            return {
                success: false,
                error: '無効なリクエストです(パスワードは8文字以上必須)。'
            };
        }

        // Firebase Admin SDKによるパスワードの直接更新
        await auth.updateUser(uid, {
            password: newPassword
        });

        console.log(`[Admin Action] Password updated for user ${uid}`);

        return {
            success: true,
            error: null
        };
    } catch (e: any) {
        console.error('Admin password reset error:', e);
        return {
            success: false,
            error: e.code || 'パスワード変更処理中にエラーが発生しました。'
        };
    }
}
