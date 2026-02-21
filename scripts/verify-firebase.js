
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

async function checkProject() {
    try {
        const auth = admin.auth();
        const user = await auth.getUserByEmail('daitan10618@icloud.com');
        console.log('✅ User found in Project:', process.env.FIREBASE_PROJECT_ID);
        console.log('UID:', user.uid);

        // Check if there are any other users
        const listUsers = await auth.listUsers(10);
        console.log('Total users (sample):', listUsers.users.length);

        process.exit(0);
    } catch (e) {
        console.error('❌ Error checking project:', e.message);
        process.exit(1);
    }
}

checkProject();
