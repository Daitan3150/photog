import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = getAdminFirestore();
        const profileDoc = await db.collection('settings').doc('profile').get();
        const siteProfile = profileDoc.data();
        const adminEmail = 'daitan10618@icloud.com';
        const adminName = siteProfile?.name || 'Daitan';
        const adminIcon = siteProfile?.imageUrl || '';

        const batch = db.batch();

        // 1. Create/Update the Admin User explicitly
        // We use the email as the Document ID for this specific manual fix if UID is unknown, 
        // but typically it should be the Firebase UID. 
        // For the fix, we will target the photo uploaderId to match this.
        const userRef = db.collection('users').doc(adminEmail);
        batch.set(userRef, {
            email: adminEmail,
            displayName: adminName,
            photoURL: adminIcon,
            role: 'admin',
            updatedAt: new Date()
        }, { merge: true });

        // 2. Update all photos in the collection
        const photoSnap = await db.collection('photos').get();
        let count = 0;
        photoSnap.forEach(doc => {
            batch.update(doc.ref, {
                uploaderId: adminEmail, // Hard-link to our manual user doc
                uploaderEmail: adminEmail,
                uploaderName: adminName,
                uploaderPhotoURL: adminIcon
            });
            count++;
        });

        await batch.commit();

        // One-time cache purge (could be done in the app later but here's faster)
        try {
            const { clearCachedData } = await import('@/lib/worker-cache');
            const CATEGORIES = ['all', 'portrait', 'snapshot', 'cosplay', 'landscape', 'animal', 'other', 'archived', 'works'];
            for (const cat of CATEGORIES) {
                await clearCachedData(`public_photos_v2_${cat}`);
            }
            await clearCachedData('public_photos');
        } catch (ce) {
            console.error('Cache clear error:', ce);
        }

        return NextResponse.json({ success: true, count, message: `Updated ${count} photos and cleared cache` });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
