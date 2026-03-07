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

        // Update all photos in the collection
        const photoSnap = await db.collection('photos').get();
        const batch = db.batch();
        let count = 0;
        photoSnap.forEach(doc => {
            batch.update(doc.ref, {
                uploaderEmail: adminEmail,
                uploaderName: adminName,
                // Optional: set uploaderPhotoURL direct to the doc just in case uploaderProfile cache misses
                uploaderPhotoURL: adminIcon
            });
            count++;
        });

        // Also ensure user profile cache isn't stale - though we're doing a total doc update
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
