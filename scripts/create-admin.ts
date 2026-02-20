import { config } from 'dotenv';
import * as admin from 'firebase-admin';

// Load environment variables from .env.local
config({ path: '.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing Firebase configuration in .env.local');
    console.error('Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set.');
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
const ADMIN_PASSWORD = 'daiki725412';

async function createAdminUser() {
    try {
        // Check if user exists
        try {
            const userRecord = await auth.getUserByEmail(ADMIN_EMAIL);
            console.log('✅ Admin user already exists:', userRecord.email);
            // Optional: Update password if needed
            // await auth.updateUser(userRecord.uid, { password: ADMIN_PASSWORD });
            return;
        } catch (error: any) {
            if (error.code !== 'auth/user-not-found') {
                throw error;
            }
        }

        // Create user
        const userRecord = await auth.createUser({
            email: ADMIN_EMAIL,
            emailVerified: true,
            password: ADMIN_PASSWORD,
            displayName: 'Admin User',
            disabled: false,
        });

        console.log('🎉 Successfully created new admin user:');
        console.log(`   Email: ${userRecord.email}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
        console.log('   UID:', userRecord.uid);

    } catch (error) {
        console.error('❌ Error creating admin user:', error);
    }
}

createAdminUser();
