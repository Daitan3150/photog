import { NextRequest, NextResponse } from 'next/server';

type StatType = 'view' | 'like';

function emptyStats() {
    return { views: 0, likes: 0 };
}

async function getStatsDoc(photoId: string) {
    const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
    const db = getAdminFirestore();
    return db.collection('photo_stats').doc(photoId);
}

export async function GET(request: NextRequest) {
    try {
        const photoId = request.nextUrl.searchParams.get('id');
        if (!photoId) {
            return NextResponse.json({ error: 'Missing photo id' }, { status: 400 });
        }

        const doc = await getStatsDoc(photoId);
        const snap = await doc.get();
        if (!snap.exists) {
            return NextResponse.json(emptyStats());
        }

        const data = snap.data() || {};
        return NextResponse.json({
            views: typeof data.views === 'number' ? data.views : 0,
            likes: typeof data.likes === 'number' ? data.likes : 0,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch photo stats';
        return NextResponse.json({ error: message, ...emptyStats() }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const photoId = request.nextUrl.searchParams.get('id');
        if (!photoId) {
            return NextResponse.json({ error: 'Missing photo id' }, { status: 400 });
        }

        const body = await request.json().catch(() => ({})) as { type?: StatType };
        const type = body.type;
        if (type !== 'view' && type !== 'like') {
            return NextResponse.json({ error: 'Invalid stat type' }, { status: 400 });
        }

        const doc = await getStatsDoc(photoId);
        const now = new Date();

        const updatedStats = await doc.firestore.runTransaction(async transaction => {
            const snap = await transaction.get(doc);
            const current = snap.exists ? (snap.data() || {}) : {};
            const views = typeof current.views === 'number' ? current.views : 0;
            const likes = typeof current.likes === 'number' ? current.likes : 0;
            const nextStats = {
                views: type === 'view' ? views + 1 : views,
                likes: type === 'like' ? likes + 1 : likes,
                updatedAt: now,
                ...(snap.exists ? {} : { createdAt: now }),
            };

            transaction.set(doc, nextStats, { merge: true });
            return { views: nextStats.views, likes: nextStats.likes };
        });

        return NextResponse.json(updatedStats);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update photo stats';
        return NextResponse.json({ error: message, ...emptyStats() }, { status: 500 });
    }
}
