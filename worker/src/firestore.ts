import { SignJWT, importPKCS8 } from 'jose';
import { Env, PhotoData } from './types';

// Helper to get Google Access Token
async function getAccessToken(env: Env): Promise<string> {
    const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const clientEmail = env.FIREBASE_CLIENT_EMAIL;

    const algorithm = 'RS256';
    const pkcs8 = await importPKCS8(privateKey, algorithm);

    const jwt = await new SignJWT({
        scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
    })
        .setProtectedHeader({ alg: algorithm })
        .setIssuer(clientEmail)
        .setSubject(clientEmail)
        .setAudience('https://oauth2.googleapis.com/token')
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(pkcs8);

    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    params.append('assertion', jwt);

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to get access token: ${text}`);
    }

    const data: any = await response.json();
    return data.access_token;
}

// Convert native types to Firestore JSON format
function toFirestoreValue(value: any): any {
    if (value === null || value === undefined) return { nullValue: null };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') {
        if (Number.isInteger(value)) return { integerValue: value };
        return { doubleValue: value };
    }
    if (typeof value === 'string') {
        // Check for ISO Date string
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            return { timestampValue: value };
        }
        return { stringValue: value };
    }
    if (Array.isArray(value)) {
        return { arrayValue: { values: value.map(toFirestoreValue) } };
    }
    if (typeof value === 'object') {
        // Handle Date object
        if (value instanceof Date) {
            return { timestampValue: value.toISOString() };
        }
        const fields: any = {};
        for (const k in value) {
            if (value[k] === undefined) continue; // Skip undefined
            fields[k] = toFirestoreValue(value[k]);
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(value) };
}

export async function batchSavePhotos(env: Env, uploaderId: string, modelId: string | null, photos: PhotoData[]) {
    const accessToken = await getAccessToken(env);
    const projectId = env.FIREBASE_PROJECT_ID;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;

    const writes = photos.map(photo => {
        const docId = crypto.randomUUID(); // Generate ID on worker
        const now = new Date().toISOString();

        // Prepare fields
        const fields: any = {
            uploaderId,
            modelId,
            url: photo.url,
            publicId: photo.publicId,
            title: photo.title || null,
            subjectName: photo.subjectName || null,
            characterName: photo.characterName || null,
            event: photo.event || null,
            location: photo.location || null,
            shotAt: (photo.shotAt && photo.shotAt.length > 0)
                ? (photo.shotAt.includes('T') ? photo.shotAt : `${photo.shotAt}T12:00:00.000Z`)
                : null,
            snsUrl: photo.snsUrl || null,
            categoryId: photo.categoryId || null,
            displayMode: photo.displayMode || 'title',
            exif: photo.exif || null,
            tags: photo.tags || [],
            createdAt: now,
            updatedAt: now,
        };

        // Coordinates
        if (photo.latitude !== undefined && photo.latitude !== null) fields.latitude = photo.latitude;
        if (photo.longitude !== undefined && photo.longitude !== null) fields.longitude = photo.longitude;
        if (photo.focalPoint) fields.focalPoint = photo.focalPoint;

        // Convert to Firestore JSON
        const firestoreFields: any = {};
        for (const key in fields) {
            firestoreFields[key] = toFirestoreValue(fields[key]);
        }

        // New document creation via update (upsert-like but with new random ID)
        // Actually, 'update' with a new path creates it.
        // But better to use 'currentDocument': { exists: false } to ensure creation?
        // Using batch write 'update' operation for simplicity.
        return {
            update: {
                name: `projects/${projectId}/databases/(default)/documents/photos/${docId}`,
                fields: firestoreFields,
            }
        };
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ writes }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Firestore batch write failed: ${text}`);
    }

    const result: any = await response.json();

    // Extract generated IDs from the writes (we generated them)
    // We might need to return them for Algolia syncing
    // The 'writes' array we created has the IDs in the 'name' field.
    return photos.map((_, i) => {
        const path = writes[i].update.name;
        const id = path.split('/').pop();
        return id!;
    });
}
