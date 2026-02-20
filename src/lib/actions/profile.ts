'use server';

// Removed top-level imports to prevent client-side leak
// Removed redundant types or top-level leaks
import { Profile } from '../firebase/profile';

interface SaveProfileResult {
    success: boolean;
    error?: string;
}

export async function updateProfile(data: Profile, idToken: string): Promise<SaveProfileResult> {
    try {
        const { getAdminFirestore, getAdminAuth } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const email = decodedToken.email;

        // Super Admin Email Check (from environment variable for security)
        const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'daitan10618@icloud.com';
        if (email !== SUPER_ADMIN_EMAIL) {
            return { success: false, error: 'Unauthorized: Admin access only' };
        }

        const db = getAdminFirestore();
        const profileRef = db.collection('settings').doc('profile');

        await profileRef.set({
            ...data,
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        return { success: true };
    } catch (error: any) {
        console.error('Error updating profile:', error);
        return { success: false, error: error.message };
    }
}

export async function getProfileServer() {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        const profileDoc = await db.collection('settings').doc('profile').get();

        if (!profileDoc.exists) {
            return { success: false, error: 'Profile not found', data: null };
        }

        return { success: true, data: profileDoc.data() as Profile };
    } catch (error: any) {
        console.error('Error fetching profile:', error);
        return { success: false, error: error.message, data: null };
    }
}
