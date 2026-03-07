'use server';

import { getAdminAuth, getAdminFirestore } from '@/lib/firebaseAdmin';

export async function getUsers() {
    try {
        const auth = getAdminAuth();
        const db = getAdminFirestore();

        const [userRecords, usersSnapshot] = await Promise.all([
            auth.listUsers(1000),
            db.collection('users').get()
        ]);

        const dbUsers = new Map();
        usersSnapshot.forEach(doc => {
            dbUsers.set(doc.id, doc.data());
        });

        const users = userRecords.users.map(user => {
            const dbUser = dbUsers.get(user.uid) || {};
            return {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || dbUser.displayName || 'Unknown',
                photoURL: user.photoURL || dbUser.photoURL || null,
                modelId: dbUser.modelId || null,
                photoCount: dbUser.photoCount || 0,
                createdAt: user.metadata.creationTime,
                lastLoginAt: user.metadata.lastSignInTime,
                role: dbUser.role || 'user'
            };
        });

        return { success: true, users };
    } catch (error: any) {
        console.error('Error fetching users:', error);
        return { success: false, error: error.message };
    }
}

export async function adminResetUserPassword(uid: string, newPassword: string) {
    try {
        const auth = getAdminAuth();
        await auth.updateUser(uid, { password: newPassword });
        return { success: true };
    } catch (error: any) {
        console.error('Failed to reset user password:', error);
        return { success: false, error: error.message };
    }
}
