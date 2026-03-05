export interface Env {
    FIREBASE_PROJECT_ID: string;
    FIREBASE_CLIENT_EMAIL: string;
    FIREBASE_PRIVATE_KEY: string;
    ALGOLIA_APP_ID: string;
    ALGOLIA_ADMIN_KEY: string;
    ALLOWED_ORIGIN: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
    DB: D1Database;
    PORTFOLIO_CACHE: KVNamespace;
    PHOTO_COUNTER: DurableObjectNamespace;
    R2_BUCKET: R2Bucket;
}

export interface PhotoData {
    url: string;
    publicId: string;
    title?: string | null;
    subjectName?: string | null;
    characterName?: string | null;
    event?: string | null;
    location?: string | null;
    shotAt?: string | null; // ISO string
    snsUrl?: string | null;
    categoryId?: string | null;
    displayMode?: 'title' | 'character';
    focalPoint?: { x: number; y: number } | null;
    exif?: Record<string, any> | null;
    tags?: string[];
    latitude?: number | null;
    longitude?: number | null;
    r2Key?: string | null;
}
