import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import { getApps } from 'firebase-admin/app';

config({ path: '.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing Firebase configuration in .env.local');
    process.exit(1);
}

if (!getApps().length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

const db = admin.firestore();

const categories = [
    { id: 'cosplay', name: 'コスプレ撮影', order: 1 },
    { id: 'portrait', name: 'ポートレート', order: 2 },
    { id: 'snapshot', name: 'スナップ撮影', order: 3 },
    { id: 'landscape', name: '風景写真', order: 4 },
    { id: 'animal', name: '動物の写真', order: 5 },
];

async function seedCategories() {
    console.log('Seeding categories...');
    const batch = db.batch();

    for (const cat of categories) {
        const ref = db.collection('categories').doc(cat.id);
        batch.set(ref, {
            name: cat.name,
            order: cat.order,
            coverUrl: '', // Initial empty cover URL
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    await batch.commit();
    console.log('Categories seeded successfully!');
}

seedCategories().catch(console.error);
