import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = getAdminFirestore();
        const profileDoc = await db.collection('settings').doc('profile').get();
        const siteProfile = profileDoc.data();

        const snap = await db.collection('users').where('email', '==', 'daitan10618@icloud.com').get();

        let msg = '';
        const batch = db.batch();
        snap.forEach(doc => {
            batch.update(doc.ref, {
                photoURL: siteProfile?.imageUrl || '',
                displayName: siteProfile?.name || 'DAITAN'
            });
            msg += 'Updated ' + doc.id + ' ';
        });
        await batch.commit();

        return NextResponse.json({ success: true, msg });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
