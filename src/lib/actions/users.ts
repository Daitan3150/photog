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
    realName?: string;
    birthday?: string;
    birthYear?: string;
    birthMonth?: string;
    birthDay?: string;
    approximateAge?: string;
    deceasedDate?: string;
    deceasedYear?: string;
    deceasedMonth?: string;
    deceasedDay?: string;
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
                realName: firestoreData.realName || '',
                birthday: firestoreData.birthday || '',
                birthYear: firestoreData.birthYear || '',
                birthMonth: firestoreData.birthMonth || '',
                birthDay: firestoreData.birthDay || '',
                approximateAge: firestoreData.approximateAge || '',
                deceasedDate: firestoreData.deceasedDate || '',
                deceasedYear: firestoreData.deceasedYear || '',
                deceasedMonth: firestoreData.deceasedMonth || '',
                deceasedDay: firestoreData.deceasedDay || '',
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

export async function updateMyProfile(data: { displayName?: string; photoURL?: string }, idToken: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const db = getAdminFirestore();

        await db.collection('users').doc(decodedToken.uid).update({
            ...(data.displayName ? { displayName: data.displayName } : {}),
            ...(data.photoURL ? { photoURL: data.photoURL } : {}),
            updatedAt: new Date().toISOString()
        });

        // Also update Firebase Auth profile for consistency
        await auth.updateUser(decodedToken.uid, {
            ...(data.displayName ? { displayName: data.displayName } : {}),
            ...(data.photoURL ? { photoURL: data.photoURL } : {})
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error updating my profile:', error);
        return { success: false, error: error.message };
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

/**
 * 管理者が指定したユーザーのプロフィール（本名、生年月日、没年月日、表示名）を更新するためのサーバーアクション。
 */
export async function adminUpdateUserProfile(
    uid: string,
    data: {
        displayName?: string;
        realName?: string;
        birthday?: string;
        birthYear?: string;
        birthMonth?: string;
        birthDay?: string;
        approximateAge?: string;
        showBirthYear?: boolean;
        deceasedDate?: string;
        deceasedYear?: string;
        deceasedMonth?: string;
        deceasedDay?: string;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const db = getAdminFirestore();

        const updateData: any = {};
        if (data.displayName !== undefined) updateData.displayName = data.displayName;
        if (data.realName !== undefined) updateData.realName = data.realName;
        if (data.birthday !== undefined) updateData.birthday = data.birthday;
        if (data.birthYear !== undefined) updateData.birthYear = data.birthYear;
        if (data.birthMonth !== undefined) updateData.birthMonth = data.birthMonth;
        if (data.birthDay !== undefined) updateData.birthDay = data.birthDay;
        if (data.approximateAge !== undefined) updateData.approximateAge = data.approximateAge;
        if (data.showBirthYear !== undefined) updateData.showBirthYear = data.showBirthYear;
        if (data.deceasedDate !== undefined) updateData.deceasedDate = data.deceasedDate;
        if (data.deceasedYear !== undefined) updateData.deceasedYear = data.deceasedYear;
        if (data.deceasedMonth !== undefined) updateData.deceasedMonth = data.deceasedMonth;
        if (data.deceasedDay !== undefined) updateData.deceasedDay = data.deceasedDay;
        updateData.updatedAt = new Date().toISOString();

        await db.collection('users').doc(uid).set(updateData, { merge: true });

        // 表示名が更新された場合、Auth側も同期する
        if (data.displayName) {
            await auth.updateUser(uid, {
                displayName: data.displayName
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error('Admin user profile update error:', error);
        return {
            success: false,
            error: error.message || 'ユーザー情報の更新中にエラーが発生しました。'
        };
    }
}

/**
 * 一般公開ページでモデルの生没年情報を取得するためのサーバーアクション。
 * 個人情報（本名、メールアドレス、UID等）は含めず、安全に取得します。
 */
export async function getPublicModels(): Promise<{ 
    success: boolean; 
    models?: { 
        displayName: string; 
        name?: string;
        birthday?: string; 
        birthYear?: string;
        birthMonth?: string;
        birthDay?: string;
        approximateAge?: string;
        showBirthYear?: boolean;
        deceasedDate?: string; 
        deceasedYear?: string;
        deceasedMonth?: string;
        deceasedDay?: string;
    }[]; 
    error?: string 
}> {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        const [usersSnapshot, subjectsSnapshot] = await Promise.all([
            db.collection('users').get(),
            db.collection('subjects').get()
        ]);

        const userModels = usersSnapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
                displayName: data.displayName || 'No Name',
                name: data.name || '',
                birthday: data.birthday || '',
                birthYear: data.birthYear || '',
                birthMonth: data.birthMonth || '',
                birthDay: data.birthDay || '',
                approximateAge: data.approximateAge || '',
                showBirthYear: data.showBirthYear === true,
                deceasedDate: data.deceasedDate || '',
                deceasedYear: data.deceasedYear || '',
                deceasedMonth: data.deceasedMonth || '',
                deceasedDay: data.deceasedDay || '',
            };
        });

        const subjectModels = subjectsSnapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
                displayName: data.name || 'No Name',
                name: data.realName || '',
                birthday: data.birthday || '',
                birthYear: data.birthYear || '',
                birthMonth: data.birthMonth || '',
                birthDay: data.birthDay || '',
                approximateAge: data.approximateAge || '',
                showBirthYear: data.showBirthYear === true,
                deceasedDate: data.deceasedDate || '',
                deceasedYear: data.deceasedYear || '',
                deceasedMonth: data.deceasedMonth || '',
                deceasedDay: data.deceasedDay || '',
            };
        });

        return { success: true, models: [...userModels, ...subjectModels] };
    } catch (error: any) {
        console.error('Error fetching public models:', error);
        return { 
            success: false, 
            error: error.message || 'モデル情報の取得中にエラーが発生しました。' 
        };
    }
}
