
const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

const config = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(config),
    });
}

const db = admin.firestore();

async function run() {
    const snapshot = await db.collection('users').get();
    snapshot.forEach(doc => {
        console.log(doc.id, '=>', doc.data());
    });
    process.exit(0);
}

run();
