import "server-only";

import * as admin from "firebase-admin";

interface FirebaseAdminConfig {
    projectId: string;
    clientEmail: string;
    privateKey: string;
}

function formatPrivateKey(key: string) {
    if (!key) return '';
    let formattedKey = key;
    // Handle cases where the key might be wrapped in quotes (Vercel behavior)
    if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
        formattedKey = formattedKey.slice(1, -1);
    }
    // Handle both literal newlines and escaped \n sequences
    return formattedKey.replace(/\\n/g, "\n").replace(/\n/g, "\n");
}

export function createFirebaseAdminApp(config: FirebaseAdminConfig) {
    const initId = Math.random().toString(36).substring(7);
    console.log(`[FirebaseAdmin][${initId}] Checking for existing app...`);

    // Next.js can sometimes re-run code, so check if app already exists
    const existingApp = admin.apps.find(app => app?.name === '[DEFAULT]');
    if (existingApp) {
        console.log(`[FirebaseAdmin][${initId}] Using existing [DEFAULT] app.`);
        return existingApp;
    }

    try {
        console.log(`[FirebaseAdmin][${initId}] Initializing NEW app for project: ${config.projectId}`);
        const start = Date.now();

        const cert = admin.credential.cert({
            projectId: config.projectId,
            clientEmail: config.clientEmail,
            privateKey: formatPrivateKey(config.privateKey),
        });

        const app = admin.initializeApp({
            credential: cert,
            projectId: config.projectId,
            storageBucket: `${config.projectId}.appspot.com`,
        });

        console.log(`[FirebaseAdmin][${initId}] Initialization successful in ${Date.now() - start}ms`);
        return app;
    } catch (error: any) {
        console.error(`[FirebaseAdmin][${initId}] Initialization failed Error:`, error.message);
        throw error;
    }
}

export function getAdminFirestore() {
    if (!process.env.FIREBASE_PRIVATE_KEY) {
        console.error('[FirebaseAdmin] FIREBASE_PRIVATE_KEY is missing');
        throw new Error("FIREBASE_PRIVATE_KEY is not defined");
    }

    const app = createFirebaseAdminApp({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!,
    });

    const db = admin.firestore(app);
    // 🔥 CRITICAL: Prevent "Cannot use undefined as a Firestore value" errors
    db.settings({ ignoreUndefinedProperties: true });
    return db;
}

export function getAdminAuth() {
    if (!process.env.FIREBASE_PRIVATE_KEY) {
        console.error('[FirebaseAdmin] FIREBASE_PRIVATE_KEY is missing');
        throw new Error("FIREBASE_PRIVATE_KEY is not defined");
    }

    const app = createFirebaseAdminApp({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!,
    });

    return admin.auth(app);
}

export function getAdminStorage() {
    if (!process.env.FIREBASE_PRIVATE_KEY) {
        console.error('[FirebaseAdmin] FIREBASE_PRIVATE_KEY is missing');
        throw new Error("FIREBASE_PRIVATE_KEY is not defined");
    }

    const app = createFirebaseAdminApp({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!,
    });

    return admin.storage(app);
}
// Export as getFirebaseAdmin for dynamic imports in server actions
export const getFirebaseAdmin = async () => {
    if (!process.env.FIREBASE_PRIVATE_KEY) {
        throw new Error("FIREBASE_PRIVATE_KEY is not defined");
    }
    return createFirebaseAdminApp({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!,
    });
};
