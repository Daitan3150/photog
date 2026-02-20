import "server-only";

import * as admin from "firebase-admin";

interface FirebaseAdminConfig {
    projectId: string;
    clientEmail: string;
    privateKey: string;
}

function formatPrivateKey(key: string) {
    return key.replace(/\\n/g, "\n");
}

export function createFirebaseAdminApp(config: FirebaseAdminConfig) {
    // Next.js can sometimes re-run code, so check if app already exists
    const existingApp = admin.apps.find(app => app?.name === '[DEFAULT]');
    if (existingApp) {
        return existingApp;
    }

    try {
        console.log(`[FirebaseAdmin] Initializing default app for project: ${config.projectId}`);

        const cert = admin.credential.cert({
            projectId: config.projectId,
            clientEmail: config.clientEmail,
            privateKey: formatPrivateKey(config.privateKey),
        });

        return admin.initializeApp({
            credential: cert,
            projectId: config.projectId,
            storageBucket: `${config.projectId}.appspot.com`,
        });
    } catch (error: any) {
        console.error('[FirebaseAdmin] Initialization failed:', error.message);
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

    return admin.firestore(app);
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
