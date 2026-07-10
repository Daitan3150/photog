import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebaseAdmin';
import { syncPhotoToAlgolia } from '@/lib/algolia';
import { clearCachedData } from '@/lib/worker-cache';
import { revalidatePath } from 'next/cache';

const CATEGORIES = ['all', 'portrait', 'snapshot', 'cosplay', 'landscape', 'animal', 'other', 'archived'];

async function purgePublicCache() {
  try {
    await clearCachedData('public_photos');
    await clearCachedData('public_photos_for_search');
    await Promise.all(CATEGORIES.map((cat) => clearCachedData(`public_photos_v2_${cat}`)));
    revalidatePath('/');
    revalidatePath('/portfolio');
    revalidatePath('/search');
  } catch (error) {
    console.error('[bulk-lens-model] cache purge failed', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const db = getAdminFirestore();

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin privileges required' }, { status: 403 });
    }

    const body = (await request.json()) as { oldLensModel?: unknown; newLensModel?: unknown };
    const oldLensModel = typeof body.oldLensModel === 'string' ? body.oldLensModel.trim() : '';
    const newLensModel = typeof body.newLensModel === 'string' ? body.newLensModel.trim() : '';

    if (!oldLensModel || !newLensModel) {
      return NextResponse.json({ success: false, error: 'oldLensModel and newLensModel are required' }, { status: 400 });
    }

    if (oldLensModel === newLensModel) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const querySnapshot = await db.collection('photos').where('exif.LensModel', '==', oldLensModel).get();
    if (querySnapshot.empty) {
      return NextResponse.json({ success: true, count: 0 });
    }

    let batch = db.batch();
    let batchCount = 0;
    let totalUpdated = 0;
    const updatedPhotoIds: string[] = [];

    for (const doc of querySnapshot.docs) {
      const ref = doc.ref;
      batch.update(ref, {
        'exif.LensModel': newLensModel,
        updatedAt: new Date(),
      });
      updatedPhotoIds.push(doc.id);
      batchCount += 1;
      totalUpdated += 1;

      if (batchCount === 500) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    await purgePublicCache();

    await Promise.all(
      updatedPhotoIds.map(async (photoId) => {
        const docRef = db.collection('photos').doc(photoId);
        const docSnap = await docRef.get();
        const updatedData = docSnap.data();
        if (updatedData) {
          await syncPhotoToAlgolia({
            id: photoId,
            ...updatedData,
            category: updatedData.categoryId,
          });
        }
      })
    );

    return NextResponse.json({ success: true, count: totalUpdated });
  } catch (error: any) {
    console.error('[bulk-lens-model] Error updating photos:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
