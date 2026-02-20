import { config } from 'dotenv';
import * as admin from 'firebase-admin';

// Load environment variables from .env.local
config({ path: '.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

const auth = admin.auth();
const ADMIN_EMAIL = 'daitan10618@icloud.com';
const DISPLAY_NAME = 'Daitan3150No.1';

async function updateAdminProfile() {
    try {
        const user = await auth.getUserByEmail(ADMIN_EMAIL);
        await auth.updateUser(user.uid, {
            displayName: DISPLAY_NAME,
        });
        console.log(`✅ Successfully updated display name for ${ADMIN_EMAIL} to "${DISPLAY_NAME}"`);
    } catch (error) {
        console.error('❌ Error updating admin profile:', error);
    }
}

updateAdminProfile();
