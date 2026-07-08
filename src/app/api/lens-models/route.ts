import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
    const db = getAdminFirestore();
    const snapshot = await db.collection('photos').select('exif').get();
    const lensNames = new Set<string>();

    snapshot.docs.forEach((doc: any) => {
      const exif = doc.data()?.exif;
      if (exif?.LensModel && typeof exif.LensModel === 'string') {
        const value = exif.LensModel.trim();
        if (value) lensNames.add(value);
      }
    });

    return NextResponse.json({ lensModels: Array.from(lensNames).sort() });
  } catch (error: any) {
    console.error('Failed to fetch lens models:', error);
    return NextResponse.json({ lensModels: [] }, { status: 500 });
  }
}
