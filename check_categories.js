const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envFile = fs.readFileSync('/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
    });
}

const db = admin.firestore();

async function checkCategories() {
    console.log('Checking categories collection...');
    try {
        const snapshot = await db.collection('categories').get();
        console.log(`Found ${snapshot.size} documents in 'categories' collection.`);
        snapshot.docs.forEach(doc => {
            console.log(`- ${doc.id}:`, doc.data());
        });

        if (snapshot.size === 0) {
            console.log('Collection is empty. Re-seeding categories might be needed.');
        }
    } catch (error) {
        console.error('Error checking categories:', error.message);
    }
}

checkCategories();
