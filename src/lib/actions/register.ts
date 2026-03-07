'use server';

import { revalidatePath } from 'next/cache';


// Removed top-level imports to prevent client-side leak
// Removed top-level admin import to prevent client-side leak

interface RegisterUserResult {
    success: boolean;
    error?: string;
}

export async function registerWithInvitation(formData: FormData): Promise<RegisterUserResult> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const displayName = formData.get('displayName') as string;
    const code = formData.get('code') as string;
    const snsLinksJson = formData.get('snsLinks') as string;

    if (!email || !password || !displayName || !code) {
        return { success: false, error: 'All fields are required.' };
    }

    const { getAdminFirestore, getAdminAuth } = await import('@/lib/firebaseAdmin');
    const db = getAdminFirestore();
    const auth = getAdminAuth();

    try {
        // 1. Verify Invitation Code
        const codesSnapshot = await db.collection('invitation_codes')
            .where('code', '==', code)
            .where('isUsed', '==', false)
            .limit(1)
            .get();

        if (codesSnapshot.empty) {
            return { success: false, error: 'Invalid or already used invitation code.' };
        }

        const codeDoc = codesSnapshot.docs[0];

        // 2. Create Firebase Auth User
        const userRecord = await auth.createUser({
            email,
            password,
            displayName,
        });

        // 3. Mark Code as Used & Create User Profile in Firestore
        // Using a transaction to ensure atomicity
        await db.runTransaction(async (transaction) => {
            // Mark code used
            transaction.update(codeDoc.ref, {
                isUsed: true,
                usedBy: userRecord.uid,
                usedAt: new Date().toISOString(),
            });

            // Generate a unique model ID (e.g., M-A1B2)
            const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();
            const modelId = `M-${randomId}`;

            // Create user profile
            const userRef = db.collection('users').doc(userRecord.uid);
            transaction.set(userRef, {
                uid: userRecord.uid,
                email,
                displayName,
                role: 'model', // Default role for invited users
                modelId,
                snsLinks: snsLinksJson ? JSON.parse(snsLinksJson) : [],
                createdAt: new Date().toISOString(),
                invitedByCode: codeDoc.id,
            });
        });

        revalidatePath('/admin/users');
        return { success: true };

    } catch (error: any) {
        console.error('Registration failed:', error);
        // Only return safe error messages
        return { success: false, error: error.message || 'Registration failed.' };
    }
}

export async function checkInvitationCode(code: string): Promise<{ success: boolean; error?: string }> {
    if (!code) return { success: false, error: 'Code is required.' };
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        const codesSnapshot = await db.collection('invitation_codes')
            .where('code', '==', code)
            .where('isUsed', '==', false)
            .limit(1)
            .get();

        if (codesSnapshot.empty) {
            return { success: false, error: 'Invalid or already used invitation code.' };
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Error checking code.' };
    }
}

export async function registerSocialUser(data: { uid: string; email: string; displayName: string; code: string; snsLinksJson?: string }): Promise<RegisterUserResult> {
    const { uid, email, displayName, code, snsLinksJson } = data;

    if (!uid || !code) {
        return { success: false, error: 'User ID and code are required.' };
    }

    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        // 1. Verify Invitation Code
        const codesSnapshot = await db.collection('invitation_codes')
            .where('code', '==', code)
            .where('isUsed', '==', false)
            .limit(1)
            .get();

        if (codesSnapshot.empty) {
            return { success: false, error: 'Invalid or already used invitation code.' };
        }

        const codeDoc = codesSnapshot.docs[0];

        // 2. Mark Code as Used & Create User Profile in Firestore
        await db.runTransaction(async (transaction) => {
            // Check if user already has a profile (to prevent duplicate processing)
            const userRef = db.collection('users').doc(uid);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                // Generate a unique model ID
                const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();
                const modelId = `M-${randomId}`;

                transaction.set(userRef, {
                    uid,
                    email: email || '',
                    displayName: displayName || 'Social User',
                    role: 'model',
                    modelId,
                    snsLinks: snsLinksJson ? JSON.parse(snsLinksJson) : [],
                    createdAt: new Date().toISOString(),
                    invitedByCode: codeDoc.id,
                });
            }

            // Mark code used
            transaction.update(codeDoc.ref, {
                isUsed: true,
                usedBy: uid,
                usedAt: new Date().toISOString(),
            });
        });

        revalidatePath('/admin/users');
        return { success: true };

    } catch (error: any) {
        console.error('Social registration failed:', error);
        return { success: false, error: error.message || 'Social registration failed.' };
    }
}
