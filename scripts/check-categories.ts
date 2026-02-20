import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import { getApps } from 'firebase-admin/app';

config({ path: '.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing Firebase configuration');
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

async function checkCategories() {
    console.log('Checking categories in Firestore...');
    const snapshot = await db.collection('categories').get();

    if (snapshot.empty) {
        console.log('❌ No categories found!');
    } else {
        console.log(`✅ Found ${snapshot.size} categories:`);
        snapshot.docs.forEach(doc => {
            console.log(`- ${doc.id}: ${doc.data().name} (Order: ${doc.data().order})`);
        });
    }
}

checkCategories().catch(console.error);
