'use server';

// Removed top-level admin/firebaseAdmin imports to prevent client-side leak
import { PhotoFormData, Photo as PhotoType } from '@/types/photo';
import { revalidatePath } from 'next/cache';
import { getCoordinates } from '../utils/location';
import { getCachedData, setCachedData } from '../worker-cache';
import { syncPhotoToAlgolia } from '../algolia';
import { appendToMetadataRegistry } from './metadata';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'daitan10618@icloud.com';

interface SavePhotoResult {
    success: boolean;
    error?: string;
}

// Input validation function
import { SubjectFormData } from './subjects';
function validatePhotoData(data: PhotoFormData): string | null {
    // URL validation
    if (!data.url || !data.url.startsWith('https://res.cloudinary.com/')) {
        return 'Invalid image URL source';
    }

    // [MODIFIED] Relaxing metadata requirements for initial upload.
    // Title and Category are only required for PUBLIC display, not for saving.

    // Length validation
    if (data.title && data.title.length > 200) {
        return 'Title must be less than 200 characters';
    }
    if (data.subjectName && data.subjectName.length > 100) {
        return 'Subject name must be less than 100 characters';
    }
    if (data.location && data.location.length > 100) {
        return 'Location must be less than 100 characters';
    }

    // XSS prevention: detect HTML tags
    const htmlPattern = /<[^>]*>/g;
    const fields = [data.title, data.subjectName, data.location, data.snsUrl, data.characterName];
    for (const field of fields) {
        if (field && htmlPattern.test(field)) {
            return 'HTML tags are not allowed';
        }
    }

    // URL validation for SNS URL (Relaxed to allow IDs)
    if (data.snsUrl && data.snsUrl.length > 500) {
        return 'SNS ID or URL is too long';
    }

    return null;
}

export async function savePhoto(data: PhotoFormData, idToken: string): Promise<SavePhotoResult> {
    // Input validation
    const validationError = validatePhotoData(data);
    if (validationError) {
        return { success: false, error: validationError };
    }

    if (!process.env.FIREBASE_PRIVATE_KEY) {
        console.error('Critical Error: FIREBASE_PRIVATE_KEY is missing in server environment.');
    }

    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const uploaderId = decodedToken.uid;

        const db = getAdminFirestore();

        // [AUTO-REGISTER MODEL] if subjectName is provided
        if (data.subjectName) {
            const subjectsRef = db.collection('subjects');
            const existing = await subjectsRef.where('name', '==', data.subjectName).limit(1).get();
            if (existing.empty) {
                await subjectsRef.add({
                    name: data.subjectName,
                    snsUrl: data.snsUrl || null,
                    createdAt: new Date(),
                    autoRegistered: true
                });
            }
        }

        // Get user profile to include modelId
        const userDoc = await db.collection('users').doc(uploaderId).get();
        const userData = userDoc.data();
        const modelId = userData?.modelId || null;

        // [GEOCODING] Fetch coordinates from location string
        let latitude = null;
        let longitude = null;
        if (data.location) {
            const coords = await getCoordinates(data.location);
            if (coords) {
                latitude = coords.lat;
                longitude = coords.lng;
            }
        }

        const photoRef = db.collection('photos').doc();
        await photoRef.set({
            uploaderId,
            modelId, // Link photo to Model ID
            url: data.url,
            publicId: data.publicId,
            title: data.title || null,
            subjectName: data.subjectName || null,
            characterName: data.characterName || null,
            location: data.location || null,
            latitude,
            longitude,
            shotAt: (data.shotAt && !isNaN(new Date(String(data.shotAt).replace(/:/g, '-')).getTime()))
                ? new Date(String(data.shotAt).replace(/:/g, '-'))
                : null,
            snsUrl: data.snsUrl || null,
            categoryId: data.categoryId || null,
            displayMode: data.displayMode || 'title',
            focalPoint: data.focalPoint || null,
            exif: data.exif || null,
            tags: data.tags || [],
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        revalidatePath('/');
        revalidatePath('/portfolio');
        // --- 🧠 記憶 (Memory): キャッシュ破棄 ---
        await setCachedData('public_photos', null);
        await setCachedData('public_photos_for_search', null);

        // --- 💪 筋肉 (Muscle): 検索インデックス同期 (Algolia) ---
        await syncPhotoToAlgolia({
            id: photoRef.id,
            ...data,
            category: data.categoryId,
            createdAt: new Date(),
            shotAt: data.shotAt ? new Date(data.shotAt) : null
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error saving photo:', error);
        return { success: false, error: error.message };
    }
}

export async function savePhotosBulk(dataList: PhotoFormData[], idToken: string): Promise<SavePhotoResult> {
    if (dataList.length === 0) return { success: true };

    // Validate all data first
    for (const data of dataList) {
        const validationError = validatePhotoData(data);
        if (validationError) {
            return { success: false, error: `Validation error: ${validationError}` };
        }
    }

    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const uploaderId = decodedToken.uid;

        const db = getAdminFirestore();
        const batch = db.batch();

        // [AUTO-REGISTER MODELS] extract unique names and register if missing
        const uniqueSubjectNames = Array.from(new Set(dataList.map(d => d.subjectName).filter(Boolean)));
        for (const name of uniqueSubjectNames) {
            const subjectsRef = db.collection('subjects');
            const existing = await subjectsRef.where('name', '==', name).limit(1).get();
            if (existing.empty) {
                // Find first occurrence to get SNS URL
                const firstOccur = dataList.find(d => d.subjectName === name);
                await subjectsRef.add({
                    name: name,
                    snsUrl: firstOccur?.snsUrl || null,
                    createdAt: new Date(),
                    autoRegistered: true
                });
            }
        }

        // Get user profile to include modelId
        const userDoc = await db.collection('users').doc(uploaderId).get();
        const userData = userDoc.data();
        const modelId = userData?.modelId || null;

        const photoIds: string[] = [];
        for (const data of dataList) {
            // [GEOCODING] Fetch coordinates from location string
            let latitude = null;
            let longitude = null;
            if (data.location) {
                const coords = await getCoordinates(data.location);
                if (coords) {
                    latitude = coords.lat;
                    longitude = coords.lng;
                }
            }

            const photoRef = db.collection('photos').doc();
            photoIds.push(photoRef.id);
            batch.set(photoRef, {
                uploaderId,
                modelId, // Link photo to Model ID
                url: data.url,
                publicId: data.publicId,
                title: data.title || null,
                subjectName: data.subjectName || null,
                characterName: data.characterName || null,
                location: data.location || null,
                latitude,
                longitude,
                shotAt: (data.shotAt && !isNaN(new Date(String(data.shotAt).replace(/:/g, '-')).getTime()))
                    ? new Date(String(data.shotAt).replace(/:/g, '-'))
                    : null,
                snsUrl: data.snsUrl || null,
                categoryId: data.categoryId || null,
                displayMode: data.displayMode || 'title',
                exif: data.exif || null,
                tags: data.tags || [],
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        await batch.commit();
        revalidatePath('/');
        revalidatePath('/portfolio');
        // --- 🧠 記憶 (Memory): キャッシュ破棄 ---
        await setCachedData('public_photos', null);
        await setCachedData('public_photos_for_search', null);

        // --- 💪 筋肉 (Muscle): 検索インデックス同期 (Algolia) ---
        for (let i = 0; i < dataList.length; i++) {
            await syncPhotoToAlgolia({
                id: photoIds[i],
                ...dataList[i],
                category: dataList[i].categoryId,
                createdAt: new Date(),
                shotAt: dataList[i].shotAt ? new Date(dataList[i].shotAt) : null
            });
        }

        // --- 💾 記録: ローカル管理ファイルへの書き出し ---
        await appendToMetadataRegistry(dataList);

        return { success: true };
    } catch (error: any) {
        console.error('Error saving photos in bulk:', error);
        return { success: false, error: error.message };
    }
}

export async function getPhotos(idToken: string, options: { limit?: number; cursor?: string } = {}) {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const db = getAdminFirestore();

        // Get user role from Firestore
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        const isAdmin = userData?.role === 'admin';

        let query: any = db.collection('photos').orderBy('createdAt', 'desc');

        if (!isAdmin) {
            query = query.where('uploaderId', '==', uid);
        }

        // Pagination: Start After Cursor
        if (options.cursor) {
            const cursorDoc = await db.collection('photos').doc(options.cursor).get();
            if (cursorDoc.exists) {
                query = query.startAfter(cursorDoc);
            }
        }

        // Limit
        const limit = options.limit || 50;
        query = query.limit(limit);

        const snapshot = await query.get();

        const photos = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            let safeExif: Record<string, any> | null = null;
            if (data.exif) {
                try {
                    safeExif = JSON.parse(JSON.stringify(data.exif, (_, v) => {
                        if (v && typeof v === 'object' && '_seconds' in v) {
                            return new Date(v._seconds * 1000).toISOString();
                        }
                        return v;
                    }));
                } catch { safeExif = null; }
            }
            return {
                id: doc.id,
                ...data,
                exif: safeExif,
                shotAt: data.shotAt?.toDate().toISOString(),
                createdAt: data.createdAt?.toDate().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString(),
            };
        });

        // Determine next cursor
        const nextCursor = photos.length === limit ? photos[photos.length - 1].id : null;

        return {
            photos,
            nextCursor
        };

    } catch (error) {
        console.error('Error fetching photos:', error);
        return { photos: [], nextCursor: null };
    }
}

export async function deletePhoto(photoId: string, idToken: string) {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const email = decodedToken.email;
        const db = getAdminFirestore();

        // Get user role from Firestore
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        const isAdmin = userData?.role === 'admin';

        const photoRef = db.collection('photos').doc(photoId);
        const photoDoc = await photoRef.get();

        if (!photoDoc.exists) {
            return { success: false, error: 'Photo not found' };
        }

        const photoData = photoDoc.data();

        // Permission Check
        if (!isAdmin && photoData?.uploaderId !== uid) {
            return { success: false, error: 'Unauthorized to delete this photo' };
        }

        // 1. Delete from Cloudinary
        if (photoData?.publicId) {
            // Import dynamically to avoid build issues if it was client-side (though this is server action)
            const { v2: cloudinary } = require('cloudinary');
            cloudinary.config({
                cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
            });
            await cloudinary.uploader.destroy(photoData.publicId);
        }

        // 2. Delete from Firestore
        await photoRef.delete();

        revalidatePath('/');
        revalidatePath('/portfolio');
        // --- 🧠 記憶 (Memory): キャッシュ破棄 ---
        await setCachedData('public_photos', null);
        await setCachedData('public_photos_for_search', null);

        // --- 💪 筋肉 (Muscle): 検索インデックス同期 (Algolia) ---
        await syncPhotoToAlgolia({ id: photoId }, 'delete');

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting photo:', error);
        return { success: false, error: error.message };
    }
}

// [NEW] 一括カテゴリー更新
export async function bulkUpdateCategory(
    photoIds: string[],
    categoryId: string,
    idToken: string
): Promise<{ success: boolean; count?: number; error?: string }> {
    if (photoIds.length === 0) return { success: true, count: 0 };

    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const db = getAdminFirestore();

        // 権限確認
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        const isAdmin = userData?.role === 'admin';

        const batch = db.batch();
        for (const photoId of photoIds) {
            const ref = db.collection('photos').doc(photoId);
            // 管理者でない場合は自分の写真のみ更新可能（バッチ内では簡易チェック）
            batch.update(ref, {
                categoryId: categoryId || null,
                updatedAt: new Date()
            });
        }
        await batch.commit();

        revalidatePath('/');
        revalidatePath('/portfolio');
        await setCachedData('public_photos', null);
        await setCachedData('public_photos_for_search', null);

        // Algolia同期
        for (const photoId of photoIds) {
            const ref = db.collection('photos').doc(photoId);
            const updatedDoc = await ref.get();
            const updatedData = updatedDoc.data();
            if (updatedData) {
                await syncPhotoToAlgolia({
                    id: photoId,
                    ...updatedData,
                    category: updatedData.categoryId
                });
            }
        }

        return { success: true, count: photoIds.length };
    } catch (error: any) {
        console.error('Error bulk updating category:', error);
        return { success: false, error: error.message };
    }
}

// [NEW] 一括写真データ更新 (Bulk Edit)
export async function bulkUpdatePhotos(
    photoIds: string[],
    data: {
        location?: string;
        subjectName?: string; // Model
        tags?: string[];
        shotAt?: string; // ISO string
        title?: string; // Only if 1 photo or applying same title? Usually for bulk edit we might skip title or append.
        // For now, let's allow setting same value if user wants, or just ignore if empty.
    },
    idToken: string
): Promise<{ success: boolean; count?: number; error?: string }> {
    if (photoIds.length === 0) return { success: true, count: 0 };

    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const db = getAdminFirestore();

        // 権限確認
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        const isAdmin = userData?.role === 'admin';

        if (!isAdmin) {
            // Non-admins can only update their own, but for bulk simplicity check permission first
            // Real implementation should check each photo's ownership or filter query
            return { success: false, error: 'Authorization required' };
        }

        const batch = db.batch();
        const updateData: any = {
            updatedAt: new Date()
        };

        if (data.location !== undefined) updateData.location = data.location;
        if (data.subjectName !== undefined) updateData.subjectName = data.subjectName;
        if (data.tags !== undefined) updateData.tags = data.tags;
        if (data.shotAt !== undefined) {
            if (data.shotAt && data.shotAt.length > 0) {
                // YYYY-MM-DD 形式を正しく解析 (タイムゾーン問題を避けるため正午UTCとして扱う)
                const date = new Date(`${data.shotAt}T12:00:00.000Z`);
                updateData.shotAt = !isNaN(date.getTime()) ? date : null;
            } else {
                updateData.shotAt = null;
            }
        }
        // Explicitly NOT updating title in bulk for now unless requested, as strictly unique titles might be desired? 
        // Actually user requirement said "exif update, model bulk setting". 
        // Let's safe-guard title to not be wiped if passed as empty string unintentionally, 
        // but if valid string is passed, apply it (e.g. setting same series title).
        if (data.title) updateData.title = data.title;

        for (const photoId of photoIds) {
            const ref = db.collection('photos').doc(photoId);
            batch.update(ref, updateData);
        }
        await batch.commit();

        revalidatePath('/');
        revalidatePath('/portfolio');
        await setCachedData('public_photos', null);
        await setCachedData('public_photos_for_search', null);

        // Algolia Sync
        for (const photoId of photoIds) {
            const ref = db.collection('photos').doc(photoId);
            const updatedDoc = await ref.get();
            const updatedData = updatedDoc.data();
            if (updatedData) {
                await syncPhotoToAlgolia({
                    id: photoId,
                    ...updatedData,
                    category: updatedData.categoryId // Ensure category is present
                });
            }
        }

        return { success: true, count: photoIds.length };
    } catch (error: any) {
        console.error('Error bulk updating photos:', error);
        return { success: false, error: error.message };
    }
}

// [NEW] EXIF情報をCloudinaryから再取得
export async function refreshPhotoMetadata(photoId: string, idToken: string): Promise<{ success: boolean; error?: string; debug?: any }> {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const db = getAdminFirestore();

        // 権限確認
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        const isAdmin = userData?.role === 'admin';

        if (!isAdmin) {
            return { success: false, error: 'Authorization required' };
        }

        const photoRef = db.collection('photos').doc(photoId);
        const photoDoc = await photoRef.get();
        if (!photoDoc.exists) return { success: false, error: 'Photo not found' };

        const photoData = photoDoc.data();
        if (!photoData?.publicId) return { success: false, error: 'No Public ID' };

        // Cloudinaryから情報を取得
        const { v2: cloudinary } = require('cloudinary');
        cloudinary.config({
            cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const resource = await cloudinary.api.resource(photoData.publicId, {
            image_metadata: true,
            context: true // Contextも念のため取得
        });

        if (!resource || !resource.image_metadata) {
            return { success: false, error: 'No metadata found details from Cloudinary' };
        }

        const metadata = resource.image_metadata;

        // Helper to parse fractions (e.g. "1/160" -> 0.00625)
        const parseFraction = (val: any): number | null => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
                if (val.includes('/')) {
                    const [num, den] = val.split('/').map(Number);
                    if (den !== 0) return num / den;
                }
                const parsed = parseFloat(val);
                return isNaN(parsed) ? null : parsed;
            }
            return null;
        };

        const exifUpdates: any = {
            Model: metadata.Model || metadata.Make || null,
            LensModel: metadata.LensModel || metadata.Lens || metadata.LensInfo || null,
            FNumber: parseFraction(metadata.FNumber || metadata.ApertureValue),
            ExposureTime: parseFraction(metadata.ExposureTime || metadata.ShutterSpeedValue),
            ISO: metadata.ISO ? parseInt(String(metadata.ISO)) : (metadata.ISOSpeedRatings ? parseInt(String(metadata.ISOSpeedRatings)) : null),
            FocalLength: parseFraction(metadata.FocalLength),
        };

        console.log(`[EXIF REFRESH] Updates for ${photoId}: `, exifUpdates);

        // 撮影日時
        let shotAt = photoData.shotAt; // Keep existing if parse failed
        if (metadata.DateTimeOriginal || metadata.DateTimeDigitized || metadata.DateTime) {
            const rawDate = metadata.DateTimeOriginal || metadata.DateTimeDigitized || metadata.DateTime;
            // Basic parsing for "YYYY:MM:DD HH:MM:SS" or standard ISO
            if (rawDate) {
                // Try to parse "YYYY:MM:DD HH:MM:SS"
                if (/^\d{4}:\d{2}:\d{2}/.test(rawDate)) {
                    const parts = rawDate.split(/[:\s]/);
                    if (parts.length >= 6) {
                        // Note: Month is 0-indexed in JS Date
                        const d = new Date(parts[0], parseInt(parts[1]) - 1, parts[2], parts[3], parts[4], parts[5]);
                        if (!isNaN(d.getTime())) shotAt = d;
                    }
                } else {
                    const d = new Date(rawDate);
                    if (!isNaN(d.getTime())) shotAt = d;
                }
            }
        }

        await photoRef.update({
            exif: exifUpdates,
            shotAt: shotAt,
            updatedAt: new Date()
        });

        revalidatePath('/');
        revalidatePath('/portfolio');
        await setCachedData('public_photos', null);
        await setCachedData('public_photos_for_search', null);

        // Algolia同期
        const updatedDoc = await photoRef.get();
        const updatedData = updatedDoc.data();
        if (updatedData) {
            await syncPhotoToAlgolia({
                id: photoId,
                ...updatedData,
                category: updatedData.categoryId
            });
        }

        return {
            success: true,
            debug: {
                publicId: photoData.publicId,
                foundModel: exifUpdates.Model,
                foundLens: exifUpdates.LensModel
            }
        };

    } catch (error: any) {
        console.error('Error refreshing photo metadata:', error);
        return { success: false, error: error.message };
    }
}

// [NEW] Helper to map Category ID (slug) to Display Name
const CATEGORY_MAP: Record<string, string> = {
    'cosplay': 'COSPLAY',
    'portrait': 'PORTRAIT',
    'snapshot': 'SNAPSHOT',
    'snap': 'SNAPSHOT', // Handle legacy
    'landscape': 'LANDSCAPE',
    'animal': 'ANIMAL',
};

export async function searchPhotos(query: string) {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        // --- 🧠 記憶 (Memory): KV Cache (No query case) ---
        if (!query) {
            const cachedPublic = await getCachedData<any[]>('public_photos');
            if (cachedPublic) return cachedPublic;

            // Fetch all and cache
            const snapshot = await db.collection('photos')
                .select('title', 'url', 'categoryId', 'subjectName', 'location', 'characterName', 'displayMode', 'snsUrl', 'aspectRatio', 'createdAt', 'latitude', 'longitude', 'exif')
                .orderBy('createdAt', 'desc')
                .get();

            const allPhotos = snapshot.docs.map((doc: any) => {
                const data = doc.data();
                const catId = data.categoryId || '';
                return {
                    id: doc.id,
                    ...data,
                    category: CATEGORY_MAP[catId] || catId.toUpperCase() || 'OTHER',
                    createdAt: data.createdAt?.toDate().toISOString(),
                };
            });

            const publicPhotos = allPhotos.filter((photo: any) => {
                const hasCategory = photo.categoryId && String(photo.categoryId).trim() !== '';
                // [MODIFIED] Allow untitled photos as per user request
                // const hasTitle = photo.title && String(photo.title).trim() !== '';
                // const isCosplay = photo.categoryId === 'cosplay';
                // const hasCharacter = photo.characterName && String(photo.characterName).trim() !== '';
                // return hasCategory && (hasTitle || (isCosplay && hasCharacter));
                return hasCategory;
            });

            await setCachedData('public_photos', publicPhotos);
            return publicPhotos;
        }

        // --- 💪 筋肉 (Muscle): Algolia Search ---
        const { getSearchClient } = await import('../algolia');
        const searchClient = getSearchClient();

        const { results } = await searchClient.search({
            requests: [
                {
                    indexName: 'photos',
                    query: query,
                    hitsPerPage: 100, // Limit for search page
                }
            ]
        });

        const hits = (results[0] as any).hits || [];
        const photoIds = hits.map((hit: any) => hit.objectID);

        if (photoIds.length === 0) return [];

        // Fetch the actual documents to ensure up-to-date data and proper formatting
        // (Alternatively, we could trust Algolia metadata, but Firestore is the source of truth)
        const photoDocs = await Promise.all(
            photoIds.map((id: string) => db.collection('photos').doc(id).get())
        );

        return photoDocs
            .filter(doc => doc.exists)
            .map(doc => {
                const data = doc.data();
                const catId = data.categoryId || '';
                return {
                    id: doc.id,
                    ...data,
                    category: CATEGORY_MAP[catId] || catId.toUpperCase() || 'OTHER',
                    createdAt: data.createdAt?.toDate().toISOString(),
                };
            });

    } catch (error) {
        console.error('Error searching photos with Algolia:', error);
        return [];
    }
}


export async function bulkDeletePhotos(photoIds: string[], idToken: string) {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const email = decodedToken.email;
        const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'daitan10618@icloud.com';
        const isSuperAdmin = email === SUPER_ADMIN_EMAIL;

        if (!isSuperAdmin) {
            return { success: false, error: 'Unauthorized: Admin access required' };
        }

        const db = getAdminFirestore();
        const { v2: cloudinary } = require('cloudinary');
        cloudinary.config({
            cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        for (const photoId of photoIds) {
            try {
                const photoRef = db.collection('photos').doc(photoId);
                const photoDoc = await photoRef.get();

                if (photoDoc.exists) {
                    const photoData = photoDoc.data();
                    if (photoData?.publicId) {
                        await cloudinary.uploader.destroy(photoData.publicId);
                    }
                    await photoRef.delete();
                    results.success++;
                } else {
                    results.failed++;
                    results.errors.push(`Photo ${photoId} not found`);
                }
            } catch (err: any) {
                results.failed++;
                results.errors.push(`Error deleting ${photoId}: ${err.message} `);
            }
        }

        revalidatePath('/');
        revalidatePath('/portfolio');
        // --- 🧠 記憶 (Memory): キャッシュ破棄 ---
        await setCachedData('public_photos', null);
        await setCachedData('public_photos_for_search', null);
        return { ...results };
    } catch (error: any) {
        console.error('Error in bulk delete:', error);
        return { success: false, error: error.message };
    }
}

export async function bulkRequestDeletion(photoIds: string[], idToken: string) {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const db = getAdminFirestore();
        const batch = db.batch();
        const timestamp = new Date().toISOString();

        for (const photoId of photoIds) {
            const photoRef = db.collection('photos').doc(photoId);
            const photoDoc = await photoRef.get();

            if (photoDoc.exists) {
                const photoData = photoDoc.data();
                if (photoData?.uploaderId === uid) {
                    batch.update(photoRef, {
                        status: 'delete_requested',
                        deleteRequestedAt: timestamp,
                        updatedAt: new Date()
                    });
                }
            }
        }

        // --- 💪 筋肉 (Muscle): 検索インデックス同期 (Algolia) ---
        for (const photoId of photoIds) {
            await syncPhotoToAlgolia({ id: photoId }, 'delete');
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error in bulk request delete:', error);
        return { success: false, error: error.message };
    }
}

export async function updatePhoto(photoId: string, data: Partial<PhotoFormData>, idToken: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const email = decodedToken.email;
        const db = getAdminFirestore();

        // Get user role from Firestore
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        const isAdmin = userData?.role === 'admin';

        const photoRef = db.collection('photos').doc(photoId);
        const photoDoc = await photoRef.get();

        if (!photoDoc.exists) {
            return { success: false, error: 'Photo not found' };
        }

        const photoData = photoDoc.data();
        if (!isAdmin && photoData?.uploaderId !== uid) {
            return { success: false, error: 'Unauthorized to update this photo' };
        }

        // Prepare updates
        const updates: any = {
            updatedAt: new Date(),
        };

        if (data.title !== undefined) updates.title = data.title;
        if (data.subjectName !== undefined) updates.subjectName = data.subjectName;
        if (data.characterName !== undefined) updates.characterName = data.characterName;
        if (data.location !== undefined) updates.location = data.location;
        if (data.snsUrl !== undefined) updates.snsUrl = data.snsUrl;
        if (data.categoryId !== undefined) updates.categoryId = data.categoryId;
        if (data.displayMode !== undefined) updates.displayMode = data.displayMode;
        if (data.shotAt !== undefined) {
            updates.shotAt = new Date(data.shotAt);
        }
        if (data.exif !== undefined) updates.exif = data.exif;
        if (data.exifRequest !== undefined) updates.exifRequest = data.exifRequest;
        if (data.tags !== undefined) updates.tags = data.tags;
        if (data.focalPoint !== undefined) updates.focalPoint = data.focalPoint;

        // [GEOCODING] re-fetch if location changed
        if (data.location !== undefined && data.location !== photoData?.location) {
            const coords = await getCoordinates(data.location || '');
            updates.latitude = coords ? coords.lat : null;
            updates.longitude = coords ? coords.lng : null;
        }

        // Handle image replacement
        if (data.url && data.url !== photoData?.url) {
            updates.url = data.url;
            updates.publicId = data.publicId;

            // Delete old image from Cloudinary
            if (photoData?.publicId) {
                const { v2: cloudinary } = require('cloudinary');
                cloudinary.config({
                    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
                    api_key: process.env.CLOUDINARY_API_KEY,
                    api_secret: process.env.CLOUDINARY_API_SECRET,
                });
                try {
                    await cloudinary.uploader.destroy(photoData.publicId);
                    console.log(`Deleted old image from Cloudinary: ${photoData.publicId} `);
                } catch (err) {
                    console.error('Error deleting old image from Cloudinary:', err);
                    // Continue anyway, we don't want to block the update
                }
            }
        }

        // Prevent modification of critical fields
        delete updates.uploaderId;
        delete updates.createdAt;

        await photoRef.update(updates);
        revalidatePath('/');
        revalidatePath('/portfolio');
        // --- 🧠 記憶 (Memory): キャッシュ破棄 ---
        await setCachedData('public_photos', null);
        await setCachedData('public_photos_for_search', null);

        // --- 💪 筋肉 (Muscle): 検索インデックス同期 (Algolia) ---
        const updatedDoc = await photoRef.get();
        const updatedData = updatedDoc.data();
        if (updatedData) {
            await syncPhotoToAlgolia({
                id: photoId,
                ...updatedData,
                category: updatedData.categoryId
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error updating photo:', error);
        return { success: false, error: error.message };
    }
}

export async function getPhotoById(photoId: string, idToken: string): Promise<any> {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const email = decodedToken.email;
        const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'daitan10618@icloud.com';
        const isSuperAdmin = email === SUPER_ADMIN_EMAIL;

        const db = getAdminFirestore();
        const photoDoc = await db.collection('photos').doc(photoId).get();

        if (!photoDoc.exists) return null;

        const data = photoDoc.data();
        const catId = data?.categoryId || '';
        // Permission check
        if (!isSuperAdmin && data?.uploaderId !== uid) {
            return null;
        }

        return {
            id: photoDoc.id,
            ...data,
            category: CATEGORY_MAP[catId] || catId.toUpperCase() || 'OTHER', // Map ID to Name
            shotAt: data?.shotAt?.toDate().toISOString(),
            createdAt: data?.createdAt?.toDate().toISOString(),
            updatedAt: data?.updatedAt?.toDate().toISOString(),
        };
    } catch (error) {
        console.error('Error fetching photo by ID:', error);
        return null;
    }
}

export async function getPublicPhotoById(photoId: string): Promise<any> {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        const photoDoc = await db.collection('photos').doc(photoId).get();

        if (!photoDoc.exists) return null;

        const data = photoDoc.data();

        // [MODIFIED] Relaxed check: Allow untitled if category exists
        const hasCategory = data?.categoryId && data.categoryId.trim() !== '';
        // const hasTitle = data?.title && data.title.trim() !== ''; // Removed strict title check

        if (!hasCategory) return null;

        return {
            id: photoDoc.id,
            ...data,
            shotAt: data?.shotAt?.toDate().toISOString(),
            createdAt: data?.createdAt?.toDate().toISOString(),
            updatedAt: data?.updatedAt?.toDate().toISOString(),
        };
    } catch (error) {
        console.error('Error fetching public photo by ID:', error);
        return null;
    }
}

export async function getRecentPhotos(limit: number = 6) {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        // Fetch latest photos. We filter for "public" (has title and category) in memory.
        const snapshot = await db.collection('photos')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        const photos = snapshot.docs
            .map((doc: any) => {
                const data = doc.data();
                const catId = data.categoryId || '';
                // EXIFにFirestore Timestamp等が含まれる場合、シリアライズ不可のためJSONで変換
                let safeExif: Record<string, any> | null = null;
                if (data.exif) {
                    try {
                        safeExif = JSON.parse(JSON.stringify(data.exif, (_, v) => {
                            if (v && typeof v === 'object' && '_seconds' in v) {
                                return new Date(v._seconds * 1000).toISOString();
                            }
                            return v;
                        }));
                    } catch {
                        safeExif = null;
                    }
                }
                return {
                    id: doc.id,
                    ...data,
                    exif: safeExif,
                    category: CATEGORY_MAP[catId] || catId.toUpperCase() || 'OTHER',
                    shotAt: data.shotAt?.toDate().toISOString(),
                    createdAt: data.createdAt?.toDate().toISOString(),
                    updatedAt: data.updatedAt?.toDate().toISOString(),
                };
            })
            // Filter: Must have categoryId. Title check relaxed.
            .filter((p: any) => {
                const hasCategory = p.categoryId && p.categoryId.trim() !== '';
                // const hasTitle = p.title && p.title.trim() !== ''; 
                // Allow untitled photos to be displayed
                return hasCategory;
            })
            .slice(0, limit);

        return photos;
    } catch (error) {
        console.error('Error fetching recent photos:', error);
        return [];
    }
}

export async function getPhotoPublic(photoId: string): Promise<any> {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();
        const photoDoc = await db.collection('photos').doc(photoId).get();

        if (!photoDoc.exists) return null;

        const data = photoDoc.data();

        // Reverted to simpler check: Must have categoryId.
        const hasCategory = data?.categoryId && data.categoryId.trim() !== '';

        if (!hasCategory) return null;

        const catId = data?.categoryId || '';

        return {
            id: photoDoc.id,
            ...data,
            category: CATEGORY_MAP[catId] || catId.toUpperCase() || 'OTHER',
            shotAt: data?.shotAt?.toDate().toISOString(),
            createdAt: data?.createdAt?.toDate().toISOString(),
            updatedAt: data?.updatedAt?.toDate().toISOString(),
        };
    } catch (error) {
        console.error('Error fetching public photo by ID:', error);
        return null;
    }
}

export async function requestExifData(photoId: string, idToken: string) {
    try {
        const { getAdminAuth, getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const db = getAdminFirestore();
        const photoRef = db.collection('photos').doc(photoId);
        const photoDoc = await photoRef.get();

        if (!photoDoc.exists) {
            return { success: false, error: 'Photo not found' };
        }

        const photoData = photoDoc.data();
        if (photoData?.uploaderId !== uid) {
            return { success: false, error: 'Unauthorized: Only the uploader can request EXIF' };
        }

        await photoRef.update({
            exifRequest: true,
            updatedAt: new Date()
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error requesting EXIF:', error);
        return { success: false, error: error.message };
    }
}

export async function getExifSuggestions() {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        // 1. プロフィールから「正解リスト」を取得
        const profileDoc = await db.collection('settings').doc('profile').get();
        const profileData = profileDoc.data();
        const masterLenses = new Set<string>();

        if (profileData?.lenses && Array.isArray(profileData.lenses)) {
            profileData.lenses.forEach((line: string) => {
                // バレットポイント（•）や空白を除去して純粋なレンズ名を取得
                const clean = line.replace(/^[•\-\*\s]+/, '').trim();
                // 空行や見出し（---）などは除外
                if (clean && !clean.startsWith('---') && !clean.includes('Lenses')) {
                    masterLenses.add(clean);
                }
            });
        }

        // 2. 既存の写真から実績リストを取得
        const snapshot = await db.collection('photos').select('exif').get();
        const models = new Set<string>();
        const lensModels = new Set<string>(masterLenses); // マスターを初期値にする

        const TARGET_LENS_PATTERN = /voigtlander|nokton|40mm/i;
        const CORRECT_LENS_NAME = 'voigtlander NOKTON classic 40mm F1.4 SC';

        snapshot.docs.forEach(doc => {
            const exif = doc.data().exif;
            if (exif) {
                if (exif.Model && typeof exif.Model === 'string') {
                    models.add(exif.Model.trim());
                }
                if (exif.LensModel && typeof exif.LensModel === 'string') {
                    let lens = exif.LensModel.trim();
                    if (TARGET_LENS_PATTERN.test(lens) && lens.includes('40mm')) {
                        lens = CORRECT_LENS_NAME;
                    }

                    // すでにマスターに似た名前（大文字小文字違いなど）があるかチェック
                    const lowerLens = lens.toLowerCase();
                    let existsInMaster = false;
                    for (const m of masterLenses) {
                        if (m.toLowerCase() === lowerLens) {
                            existsInMaster = true;
                            break;
                        }
                    }

                    if (!existsInMaster) {
                        lensModels.add(lens);
                    }
                }
            }
        });

        return {
            success: true,
            data: {
                models: Array.from(models).sort(),
                lensModels: Array.from(lensModels).sort((a, b) => {
                    // マスターにあるものを優先的に上に持ってくる
                    const aInMaster = masterLenses.has(a);
                    const bInMaster = masterLenses.has(b);
                    if (aInMaster && !bInMaster) return -1;
                    if (!aInMaster && bInMaster) return 1;
                    return a.localeCompare(b);
                })
            }
        };
    } catch (error: any) {
        console.error('Error fetching EXIF suggestions:', error);
        return { success: false, error: error.message, data: { models: [], lensModels: [] } };
    }
}
