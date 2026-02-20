require('dotenv').config({ path: '.env.local' });
const { createClient } = require('microcms-js-sdk');
const cloudinary = require('cloudinary').v2;
const admin = require('firebase-admin');

async function testConnections() {
    console.log('--- Starting Connection Tests ---');

    // 1. Test MicroCMS
    try {
        console.log('Testing MicroCMS...');
        const client = createClient({
            serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN,
            apiKey: process.env.MICROCMS_API_KEY,
        });
        // Try to fetch 'news' endpoint (since we just made it)
        await client.getList({ endpoint: 'news' });
        console.log('✅ MicroCMS Connection: OK (Endopoint "news" reachable)');
    } catch (error) {
        console.error('❌ MicroCMS Connection: FAILED', error.message);
    }

    // 2. Test Cloudinary
    try {
        console.log('Testing Cloudinary...');
        cloudinary.config({
            cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true,
        });
        await cloudinary.api.ping();
        console.log('✅ Cloudinary Connection: OK');
    } catch (error) {
        console.error('❌ Cloudinary Connection: FAILED', error.message);
    }

    // 3. Test Firebase Admin (Firestore)
    try {
        console.log('Testing Firebase Firestore...');
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                })
            });
        }
        const db = admin.firestore();
        await db.collection('photos').limit(1).get();
        console.log('✅ Firebase Firestore Connection: OK');
    } catch (error) {
        console.error('❌ Firebase Firestore Connection: FAILED', error);
    }
}

testConnections();
