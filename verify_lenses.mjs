
import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config({ path: '.env.local' });

function getDB() {
    if (admin.apps.length === 0) {
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
        if (serviceAccountPath) {
            const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp();
        }
    }
    return admin.firestore();
}

async function verify() {
    const db = getDB();
    const snapshot = await db.collection('photos').get();
    const lenses = new Set();

    snapshot.docs.forEach(doc => {
        const exif = doc.data().exif;
        if (exif && exif.LensModel) {
            lenses.add(exif.LensModel);
        }
    });

    console.log('--- Current Lenses in Firestore ---');
    Array.from(lenses).sort().forEach(l => console.log(`- ${l}`));
}

verify().catch(console.error);
