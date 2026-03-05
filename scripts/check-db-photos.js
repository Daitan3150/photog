const admin = require('firebase-admin');
const fs = require('fs');

// Load env from .env.local.temp
const envFile = fs.readFileSync('.env.local.temp', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let val = match[2].replace(/^["']|["']$/g, '');
        env[match[1]] = val;
    }
});

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

async function check() {
    console.log('--- Database Check ---');
    try {
        const photosSnapshot = await db.collection('photos').limit(5).get();
        console.log(`Photos count (limit 5): ${photosSnapshot.size}`);
        photosSnapshot.forEach(doc => {
            console.log(`- ID: ${doc.id}, Title: ${doc.data().title || 'Untitled'}`);
        });

        const catsSnapshot = await db.collection('categories').get();
        console.log(`Categories count: ${catsSnapshot.size}`);
        catsSnapshot.forEach(doc => {
            console.log(`- ID: ${doc.id}, Name: ${doc.data().name}`);
        });

    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit(0);
}

check();
