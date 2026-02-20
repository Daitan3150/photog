const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;

async function checkUsage() {
    try {
        // Firebase Admin config
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
        }

        const db = admin.firestore();
        const photosSnapshot = await db.collection('photos').get();
        const photoCount = photosSnapshot.size;
        console.log(`--- Firestore ---`);
        console.log(`Total Photos in Firestore: ${photoCount}`);

        // Cloudinary config
        cloudinary.config({
            cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        console.log(`\n--- Cloudinary ---`);
        const usage = await cloudinary.api.usage();
        console.log(JSON.stringify(usage, null, 2));
    } catch (error) {
        console.error('Error checking usage:', error);
    }
}

checkUsage();
