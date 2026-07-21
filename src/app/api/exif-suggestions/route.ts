import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { buildLensDatalistOptions } from '@/lib/utils/lensSuggestions';
import { extractLensNamesFromProfileData } from '@/lib/utils/exifSuggestions';

export async function GET() {
  try {
    const db = getAdminFirestore();

    const profileDoc = await db.collection('settings').doc('profile').get();
    const profileData = profileDoc.data();
    const masterLenses = extractLensNamesFromProfileData(profileData);

    const snapshot = await db.collection('photos').select('exif').get();
    const models = new Set<string>();
    const additionalLenses: string[] = [];

    const TARGET_LENS_PATTERN = /voigtlander|nokton|40mm/i;
    const CORRECT_LENS_NAME = 'voigtlander NOKTON classic 40mm F1.4 SC';

    snapshot.docs.forEach((doc: any) => {
      const exif = doc.data().exif;
      if (exif) {
        if (exif.Model && typeof exif.Model === 'string') {
          const modelName = exif.Model.trim();
          if (modelName) models.add(modelName);
        }
        if (exif.LensModel && typeof exif.LensModel === 'string') {
          let lens = exif.LensModel.trim();
          if (TARGET_LENS_PATTERN.test(lens) && lens.includes('40mm')) {
            lens = CORRECT_LENS_NAME;
          }
          if (lens) additionalLenses.push(lens);
        }
      }
    });

    const lensModels = buildLensDatalistOptions(masterLenses, additionalLenses);

    return NextResponse.json({
      success: true,
      data: {
        models: Array.from(models).sort(),
        lensModels,
      },
    });
  } catch (error: any) {
    console.error('Error fetching EXIF suggestions:', error);
    return NextResponse.json({ success: false, error: error.message, data: { models: [], lensModels: [] } }, { status: 500 });
  }
}
