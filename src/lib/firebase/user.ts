import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export type UserRole = 'admin' | 'model' | 'user';

export const getUserRole = async (uid: string, skipCache = false): Promise<UserRole | null> => {
    const cacheKey = `user-role-${uid}`;

    if (!skipCache) {
        const cached = typeof window !== 'undefined' ? sessionStorage.getItem(cacheKey) : null;
        if (cached) return cached as UserRole;
    }

    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            const role = userDoc.data().role as UserRole;
            if (typeof window !== 'undefined') {
                sessionStorage.setItem(cacheKey, role);
            }
            return role;
        }

        // Final fallback: check for admin emails if no document exists
        // (Note: In a production app, we would normally use custom claims)
        return null;
    } catch (error) {
        console.error('Error fetching user role:', error);
        return null;
    }
};
