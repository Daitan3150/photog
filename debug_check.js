const admin = require('firebase-admin');
const fs = require('fs');

// Extract individual variables manually to avoid parsing issues
const envFile = fs.readFileSync('/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.env.local', 'utf8');
const getEnv = (key) => {
    const match = envFile.match(new RegExp(`${key}=(.*)`));
    if (!match) return null;
    let val = match[1].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
    return val;
};

const projectId = getEnv('FIREBASE_PROJECT_ID');
const clientEmail = getEnv('FIREBASE_CLIENT_EMAIL');
const privateKey = getEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
        })
    });
}

const db = admin.firestore();

async function check() {
    console.log('--- FIRESTORE CATEGORIES CHECK ---');
    try {
        const snap = await db.collection('categories').get();
        console.log(`Total Categories: ${snap.size}`);
        snap.docs.forEach(doc => {
            console.log(`ID: ${doc.id}, Name: ${doc.data().name}`);
        });

        if (snap.size === 0) {
            console.log('WARNING: The collection is EMPTY.');
        }
    } catch (e) {
        console.error('Connection error:', e.message);
    }
}

check();
