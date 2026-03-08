'use server';

export async function getCoordinatesAction(locationName: string) {
    const { getCoordinates } = await import('../utils/location');
    return await getCoordinates(locationName);
}

export async function searchCoordinatesAction(locationName: string) {
    const { searchCoordinates } = await import('../utils/location');
    return await searchCoordinates(locationName);
}

// Removed top-level admin/firebaseAdmin imports to prevent client-side leak
import { PhotoFormData, Photo as PhotoType } from '@/types/photo';
import { serializeData } from '../utils/serialization';
import { getCoordinates } from '../utils/location';
import { getCachedData, setCachedData, clearCachedData } from '../worker-cache';
import { syncPhotoToAlgolia } from '../algolia';
import { appendToMetadataRegistry } from './metadata';
import { revalidatePath } from 'next/cache';

const CATEGORIES = ['all', 'portrait', 'snapshot', 'cosplay', 'landscape', 'animal', 'other', 'archived'];

async function purgePublicCache() {
    try {
        // 基本のキャッシュ
        await clearCachedData('public_photos');
        await clearCachedData('public_photos_for_search');

        // バージョン付き各カテゴリーのキャッシュをすべてクリア
        await Promise.all(CATEGORIES.map(cat => clearCachedData(`public_photos_v2_${cat}`)));

        console.log('[Cache Purge] All public photo caches cleared.');

        revalidatePath('/');
        revalidatePath('/portfolio');
        revalidatePath('/search');
    } catch (e) {
        console.error('[Cache Purge Error]', e);
    }
}

const SUPER_ADMIN_EMAILS = ['daitan10618@icloud.com', 'daitan10618@gmail.com', 'new.sasuke.sakura@gmail.com'];
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

        // [AUTO-GRANT ADMIN] for specific email in server action
        const isSuperAdminByEmail = SUPER_ADMIN_EMAILS.includes(decodedToken.email || '') || decodedToken.email === SUPER_ADMIN_EMAIL;

        const modelId = userData?.modelId || null;
        const role = userData?.role || (isSuperAdminByEmail ? 'admin' : null);

        // [GEOCODING] Fetch coordinates
        let latitude = data.latitude ?? null;
        let longitude = data.longitude ?? null;

        const geocodeQuery = data.address || data.location;

        if (geocodeQuery && latitude === null && longitude === null) {
            const coords = await getCoordinates(geocodeQuery);
            if (coords) {
                latitude = coords.lat;
                longitude = coords.lng;
                // Store formal address only if no manual address was provided
                if (!data.address && coords.displayName) {
                    (data as any).address = coords.displayName;
                }
            }
        }

        const photoRef = db.collection('photos').doc();
        const photoId = photoRef.id;
        const photoDataToSave = {
            uploaderId,
            uploaderEmail: decodedToken.email || null,
            uploaderName: userData?.displayName || decodedToken.name || null,
            modelId, // Link photo to Model ID
            url: data.url,
            publicId: data.publicId,
            title: data.title || null,
            subjectName: data.subjectName || null,
            characterName: data.characterName || null,
            event: data.event || null,
            location: data.location || null,
            address: (data as any).address || null,
            addressZip: data.addressZip || null,
            addressPref: data.addressPref || null,
            addressCity: data.addressCity || null,
            latitude,
            longitude,
            shotAt: (data.shotAt && !isNaN(new Date(String(data.shotAt).replace(/:/g, '-')).getTime()))
                ? new Date(String(data.shotAt).replace(/:/g, '-'))
                : null,
            snsUrl: data.snsUrl || null,
            categoryId: data.categoryId || null,
            displayMode: data.displayMode || 'title',
            focalPoint: data.focalPoint || null,
            exif: serializeData(data.exif),
            tags: data.tags || [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await photoRef.set(photoDataToSave);



        revalidatePath('/');
        revalidatePath('/portfolio');
        // --- 🧠 記憶 (Memory): キャッシュ完全破棄 ---
        await purgePublicCache();

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
            // [GEOCODING] Fetch coordinates
            let latitude = data.latitude ?? null;
            let longitude = data.longitude ?? null;

            const geocodeQuery = data.address || data.location;

            if (geocodeQuery && latitude === null && longitude === null) {
                const coords = await getCoordinates(geocodeQuery);
                if (coords) {
                    latitude = coords.lat;
                    longitude = coords.lng;
                    // Store formal address only if no manual address was provided
                    if (!data.address && coords.displayName) {
                        (data as any).address = coords.displayName;
                    }
                }
            }

            const photoRef = db.collection('photos').doc();
            photoIds.push(photoRef.id);
            const shotAtDate = (data.shotAt && !isNaN(new Date(String(data.shotAt).replace(/:/g, '-')).getTime()))
                ? (String(data.shotAt).includes('T') ? new Date(data.shotAt) : new Date(`${data.shotAt}T12:00:00.000Z`))
                : null;

            batch.set(photoRef, {
                uploaderId,
                modelId, // Link photo to Model ID
                url: data.url,
                publicId: data.publicId,
                title: data.title || null,
                subjectName: data.subjectName || null,
                characterName: data.characterName || null,
                event: data.event || null,
                location: data.location || null,
                address: (data as any).address || null,
                addressZip: data.addressZip || null,
                addressPref: data.addressPref || null,
                addressCity: data.addressCity || null,
                latitude,
                longitude,
                shotAt: shotAtDate,
                snsUrl: data.snsUrl || null,
                categoryId: data.categoryId || null,
                displayMode: data.displayMode || 'title',
                focalPoint: data.focalPoint || null,
                exif: serializeData(data.exif),
                tags: data.tags || [],
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        await batch.commit();

        revalidatePath('/');
        revalidatePath('/portfolio');
        revalidatePath('/search');
        // --- 🧠 記憶 (Memory): キャッシュ完全破棄 ---
        await purgePublicCache();



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

        let db;
        try {
            db = getAdminFirestore();
        } catch (initError: any) {
            console.error('[getPhotos] Firestore initialization failed:', initError.message);
            return { photos: [], nextCursor: null };
        }

        // Get user role from Firestore
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        const email = decodedToken.email;
        const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(email || '') || email === SUPER_ADMIN_EMAIL;
        const isAdmin = userData?.role === 'admin' || isSuperAdmin;

        console.log(`[getPhotos] Starting fetch for UID: ${uid} (Admin: ${isAdmin})`);

        // 🛠️ 安全策: インデックスエラーを避けるため orderBy を外し、まず where だけ、あるいは全件で取得
        let query: any = db.collection('photos');

        if (!isAdmin) {
            query = query.where('uploaderId', '==', uid);
        }

        // Limit を少し多めに取ってメモリでソートする (インデックス不要にするため)
        const fetchLimit = 200;
        const snapshot = await query.limit(fetchLimit).get();
        console.log(`[getPhotos] Firestore returned ${snapshot.size} docs.`);

        let photos = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            const safeExif = serializeData(data.exif);
            const catId = String(data.categoryId || '');

            return {
                id: doc.id,
                uploaderId: data.uploaderId || '',
                uploaderEmail: data.uploaderEmail || '',
                uploaderName: data.uploaderName || '',
                url: data.url || '',
                title: data.title || '',
                subjectName: data.subjectName || '',
                characterName: data.characterName || '',
                location: data.location || '',
                address: data.address || '',
                categoryId: data.categoryId || null,
                category: CATEGORY_MAP[catId] || catId.toUpperCase() || 'OTHER',
                snsUrl: data.snsUrl || '',
                displayMode: data.displayMode || 'title',
                focalPoint: data.focalPoint || null,
                aspectRatio: data.aspectRatio || 1.5,
                tags: data.tags || [],
                latitude: data.latitude || null,
                longitude: data.longitude || null,
                exif: safeExif,
                shotAt: serializeData(data.shotAt),
                createdAt: serializeData(data.createdAt) || new Date().toISOString(),
                updatedAt: serializeData(data.updatedAt) || new Date().toISOString(),
            };
        });

        // 🛠️ メモリ上でソート (降順)
        photos.sort((a: any, b: any) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });

        // 🔄 Enrich with uploader profiles
        const photosWithUploader = await enrichPhotosWithUploader(photos, db);

        // 本来の Limit 分だけ抽出
        const finalPhotos = photosWithUploader.slice(0, options.limit || 50);
        const nextCursor = photosWithUploader.length > (options.limit || 50) ? String(photosWithUploader[(options.limit || 50) - 1].id) : null;

        console.log(`[getPhotos] Returning ${finalPhotos.length} photos.`);

        const result = {
            photos: finalPhotos,
            nextCursor: nextCursor
        };

        // Nuclear serialization sweep to ensure only plain objects are passed
        return serializeData(result);

    } catch (error: any) {
        console.error('[getPhotos] Fatal error:', error.message);
        return { photos: [], nextCursor: null, error: String(error.message) };
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
        revalidatePath('/search');
        await purgePublicCache();

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
        title?: string;
        event?: string;
        characterName?: string;
        displayMode?: 'title' | 'character';
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
        if (data.event !== undefined) updateData.event = data.event;
        if (data.characterName !== undefined) updateData.characterName = data.characterName;
        if (data.displayMode !== undefined) updateData.displayMode = data.displayMode;

        for (const photoId of photoIds) {
            const ref = db.collection('photos').doc(photoId);
            batch.update(ref, updateData);
        }
        await batch.commit();

        revalidatePath('/');
        revalidatePath('/portfolio');
        revalidatePath('/search');
        await purgePublicCache();

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
        revalidatePath('/search');
        await purgePublicCache();

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

// 🔄 Helper to map Category ID (slug) to Display Name
const CATEGORY_MAP: Record<string, string> = {
    'cosplay': 'COSPLAY',
    'portrait': 'PORTRAIT',
    'snapshot': 'SNAPSHOT',
    'snap': 'SNAPSHOT', // Handle legacy
    'landscape': 'LANDSCAPE',
    'animal': 'ANIMAL',
    'archived': 'ARCHIVED',
    'works': 'WORKS',
};

// 🏛️ Cache for user profiles to avoid N+1 queries during photo fetch
const userProfileCache = new Map<string, { displayName: string, photoURL: string }>();

/**
 * 🔄 Helper function to enrich photos with uploader profile info and admin overrides.
 * This ensures consistent branding and uploader icons across the entire app.
 */
async function enrichPhotosWithUploader(photos: any[], db: any) {
    if (!photos || photos.length === 0) return [];

    // 1. Fetch Admin Profile for override (Daitan's custom name and icon)
    let adminName = 'Daitan';
    let adminPhotoURL = '/images/portrait.png';
    try {
        const profileDoc = await db.collection('settings').doc('profile').get();
        if (profileDoc.exists) {
            const pData = profileDoc.data();
            adminName = pData?.name || 'Daitan';
            adminPhotoURL = pData?.imageUrl || '/images/portrait.png';
        }
    } catch (e) {
        console.error('[enrichPhotos] Admin profile fetch error:', e);
    }

    // 2. Fetch missing uploader profiles from 'users' collection
    const uploaderIds = Array.from(new Set(
        photos.map(p => p.uploaderId).filter(id => id && typeof id === 'string' && !userProfileCache.has(id))
    )) as string[];

    if (uploaderIds.length > 0) {
        try {
            for (let i = 0; i < uploaderIds.length; i += 10) {
                const chunk = uploaderIds.slice(i, i + 10);
                const userDocs = await db.collection('users').where('__name__', 'in', chunk).get();
                userDocs.forEach((doc: any) => {
                    const d = doc.data();
                    const is_admin = SUPER_ADMIN_EMAILS.includes(d.email || d.uploaderEmail || '');
                    userProfileCache.set(doc.id, {
                        displayName: is_admin ? adminName : (d.displayName || d.email?.split('@')[0] || 'Anonymous'),
                        photoURL: is_admin ? adminPhotoURL : (d.photoURL || '')
                    });
                });
            }
        } catch (e) {
            console.error('[enrichPhotos] User fetch error:', e);
        }
    }

    // 3. Map and Apply Override Logic
    return photos.map(data => {
        const uploaderId = data.uploaderId;
        const uploaderEmail = data.uploaderEmail;

        // Is this an admin photo? Check by Email directly OR by ID already in cache
        const cachedUploader = uploaderId ? userProfileCache.get(uploaderId) : null;
        const is_admin = SUPER_ADMIN_EMAILS.includes(uploaderEmail || '') ||
            (cachedUploader && SUPER_ADMIN_EMAILS.includes(cachedUploader.displayName)); // Catch cases where email was used as name

        // Final attribution
        let finalName = '';
        let finalPhotoURL = '';

        if (is_admin) {
            finalName = adminName;
            finalPhotoURL = adminPhotoURL;
        } else if (cachedUploader) {
            finalName = cachedUploader.displayName;
            finalPhotoURL = cachedUploader.photoURL;
        } else {
            // Fallback: If it's an email, we show the part before @ if admin, but here it's already checked.
            // For regular users, we show their stored name or split email if allowed.
            const uName = data.uploaderName || uploaderEmail?.split('@')[0] || 'Anonymous';
            finalName = uName;
            finalPhotoURL = '';
        }

        return {
            ...data,
            uploaderName: finalName,
            uploaderPhotoURL: finalPhotoURL
        };
    });
}
export async function searchPhotos(query: string, options: { category?: string; limit?: number } = {}) {
    const { category, limit = 50 } = options;
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        // Safety check for DB connection
        if (!db) throw new Error('Failed to initialize Firestore');

        if (!query) {
            // キャッシュキーを更新して古い（空の）キャッシュを無視する
            const cacheKey = `public_photos_v2_${category || 'all'}`;
            const cachedPublic = await getCachedData<any[]>(cacheKey);
            if (cachedPublic) return cachedPublic;

            let photos: any[] = [];
            const targetCat = category?.toLowerCase();

            if (!targetCat || targetCat === 'all') {
                // 通常の全件取得（インデックス不要）
                const snapshot = await db.collection('photos')
                    .orderBy('createdAt', 'desc')
                    .limit(limit)
                    .get();
                photos = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
            } else {
                // 🛠️ 特定カテゴリの取得
                let queryRef = db.collection('photos').where('categoryId', '==', targetCat);

                // カテゴリ名の揺れを吸収
                if (targetCat === 'snapshot') {
                    queryRef = db.collection('photos').where('categoryId', 'in', ['snapshot', 'snap', 'SNAPSHOT', 'SNAP']);
                } else if (targetCat === 'landscape') {
                    queryRef = db.collection('photos').where('categoryId', 'in', ['landscape', 'LANDSCAPE']);
                }

                const snapshot = await queryRef.limit(200).get();
                photos = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

                // メモリ上でソート
                photos.sort((a: any, b: any) => {
                    let dateA = 0;
                    let dateB = 0;
                    const getT = (v: any) => v?.toDate ? v.toDate().getTime() : (v ? new Date(v).getTime() : 0);
                    dateA = getT(a.createdAt);
                    dateB = getT(b.createdAt);
                    if (isNaN(dateA)) dateA = 0;
                    if (isNaN(dateB)) dateB = 0;
                    return dateB - dateA;
                });

                if (photos.length > limit) photos = photos.slice(0, limit);
            }

            // 🔄 Enrich with uploader profiles
            const results_raw = await enrichPhotosWithUploader(photos, db);

            const results_data = results_raw.map((data: any) => {
                const catId = String(data.categoryId || '');
                return {
                    ...data,
                    categoryId: catId,
                    category: CATEGORY_MAP[catId] || catId.toUpperCase() || 'OTHER',
                    latitude: data.latitude || null,
                    longitude: data.longitude || null,
                };
            }).filter((p: any) =>
                p.categoryId &&
                String(p.categoryId).trim() !== '' &&
                p.categoryId !== 'archived' &&
                p.url &&
                String(p.url).trim() !== ''
            );

            const serialized = serializeData(results_data);
            await setCachedData(cacheKey, serialized, 3600);
            return serialized;
        }

        // --- 💪 筋肉 (Muscle): Algolia Search ---
        const { getSearchClient } = await import('../algolia');
        const searchClient = getSearchClient();

        const searchParams: any = {
            indexName: 'photos',
            query: query,
            hitsPerPage: limit,
        };

        if (category && category !== 'all') {
            searchParams.filters = `category:${category}`;
        }

        const { results } = await searchClient.search({
            requests: [searchParams]
        });

        const hits = (results[0] as any).hits || [];
        const photoIds = hits.map((hit: any) => hit.objectID);

        if (photoIds.length === 0) return [];

        // Fetch docs from Firestore via SDK
        const photoDocs = await Promise.all(
            photoIds.map(async (id: string) => {
                const doc = await db.collection('photos').doc(id).get();
                return doc.exists ? { id: doc.id, ...doc.data() } : null;
            })
        );

        // 🔄 Enrich with uploader profiles
        const results_raw = await enrichPhotosWithUploader(photoDocs.filter(Boolean), db);

        const results_data = results_raw
            .map((data: any) => {
                const catId = String(data.categoryId || '');
                return {
                    ...data,
                    latitude: data.latitude || null,
                    longitude: data.longitude || null,
                    category: CATEGORY_MAP[catId] || CATEGORY_MAP[catId.toLowerCase()] || catId.toUpperCase() || 'LANDSCAPE',
                };
            });

        return serializeData(results_data);

    } catch (error) {
        console.error('Error searching photos:', error);
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
        revalidatePath('/search');
        await purgePublicCache();
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
        if (data.event !== undefined) updates.event = data.event;
        if (data.address !== undefined) updates.address = data.address;
        if (data.shotAt !== undefined) {
            if (data.shotAt && String(data.shotAt).length > 0) {
                const parsed = new Date(data.shotAt);
                updates.shotAt = !isNaN(parsed.getTime()) ? parsed : null;
            } else {
                updates.shotAt = null;
            }
        }
        if (data.exif !== undefined) {
            // Use deep serialization to clean up undefined values, Timestamps, and nested objects
            updates.exif = serializeData(data.exif);
        }
        if (data.exifRequest !== undefined) updates.exifRequest = data.exifRequest;
        if (data.tags !== undefined) updates.tags = data.tags;
        if (data.focalPoint !== undefined) updates.focalPoint = data.focalPoint;

        if (data.latitude !== undefined) updates.latitude = data.latitude;
        if (data.longitude !== undefined) updates.longitude = data.longitude;

        // [GEOCODING] re-fetch if location changed AND manual coordinates not provided
        if (data.location !== undefined && data.location !== photoData?.location &&
            data.latitude === undefined && data.longitude === undefined) {
            const coords = await getCoordinates(data.location || '');
            updates.latitude = coords ? coords.lat : null;
            updates.longitude = coords ? coords.lng : null;
            if (coords?.displayName) {
                updates.address = coords.displayName;
            }
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

        // 🔥 CRITICAL FIX: Actually update the document in Firestore
        await photoRef.update(updates);

        revalidatePath('/');
        revalidatePath('/portfolio');
        revalidatePath('/search');
        await purgePublicCache();

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

        const safeExif = serializeData(data?.exif);

        return serializeData({
            id: photoDoc.id,
            ...data,
            address: data?.address || '',
            latitude: data?.latitude || null,
            longitude: data?.longitude || null,
            exif: safeExif,
            category: CATEGORY_MAP[String(catId)] || String(catId).toUpperCase() || 'OTHER',
            shotAt: data?.shotAt,
            createdAt: data?.createdAt || new Date().toISOString(),
            updatedAt: data?.updatedAt || new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error fetching photo by ID:', error);
        return null;
    }
}

export async function getPublicPhotoById(photoId: string): Promise<any> {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        const doc = await db.collection('photos').doc(photoId).get();
        if (!doc.exists) return null;

        const data = doc.data();
        const catId = String(data?.categoryId || '');

        const photo = {
            id: photoId,
            ...data,
            address: data?.address || '',
            latitude: data?.latitude || null,
            longitude: data?.longitude || null,
            category: CATEGORY_MAP[catId] || catId.toUpperCase() || 'OTHER',
            shotAt: serializeData(data?.shotAt),
            createdAt: serializeData(data?.createdAt),
            updatedAt: serializeData(data?.updatedAt),
        };

        return serializeData(photo);
    } catch (error) {
        console.error('Error fetching public photo by ID:', error);
        return null;
    }
}

export async function getRecentPhotos(limit: number = 6) {
    try {
        const { getAdminFirestore } = await import('@/lib/firebaseAdmin');
        const db = getAdminFirestore();

        const snapshot = await db.collection('photos')
            .orderBy('createdAt', 'desc')
            .limit(limit + 10)
            .get();

        const photosRaw = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        // 🔄 Enrich with uploader profiles
        const enriched = await enrichPhotosWithUploader(photosRaw, db);

        const photos = enriched
            .map((data: any) => {
                const catId = data.categoryId || '';
                return {
                    ...data,
                    address: data.address || '',
                    latitude: data.latitude || null,
                    longitude: data.longitude || null,
                    category: CATEGORY_MAP[String(catId)] || String(catId).toUpperCase() || 'OTHER',
                    shotAt: serializeData(data.shotAt),
                    createdAt: serializeData(data.createdAt),
                    updatedAt: serializeData(data.updatedAt),
                };
            })
            .filter((p: any) => p.categoryId && String(p.categoryId).trim() !== '');

        // Apply featured genres sort
        const featuredGenres = ['portrait', 'snapshot'];
        photos.sort((a: any, b: any) => {
            const aCat = String(a.categoryId).toLowerCase();
            const bCat = String(b.categoryId).toLowerCase();
            const aIsFeatured = featuredGenres.includes(aCat);
            const bIsFeatured = featuredGenres.includes(bCat);

            if (aIsFeatured && !bIsFeatured) return -1;
            if (!aIsFeatured && bIsFeatured) return 1;
            return 0;
        });

        return serializeData(photos.slice(0, limit));
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
        const hasCategory = data?.categoryId && String(data.categoryId).trim() !== '';

        if (!hasCategory) return null;

        const catId = String(data?.categoryId || '');

        const safeExif = serializeData(data.exif);

        return {
            id: photoDoc.id,
            ...data,
            exif: safeExif,
            category: CATEGORY_MAP[catId] || catId.toUpperCase() || 'OTHER',
            shotAt: serializeData(data.shotAt),
            createdAt: serializeData(data.createdAt) || new Date().toISOString(),
            updatedAt: serializeData(data.updatedAt) || new Date().toISOString(),
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

        snapshot.docs.forEach((doc: any) => {
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
                lensModels: Array.from(lensModels).sort((a: any, b: any) => {
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
