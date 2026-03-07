const admin = require('./node_modules/firebase-admin');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envPairs = envFile.split('\n');
for (const pair of envPairs) {
    if (pair && pair.includes('=')) {
        const index = pair.indexOf('=');
        const key = pair.slice(0, index);
        let value = pair.slice(index + 1).replace(/^['"](.*)['"]$/, '$1');
        process.env[key.trim()] = value.trim();
    }
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
    });
}

async function setPassword() {
    const email = 'admin@daitan.com';
    const newPassword = 'mivxin-tegmo4-xottuM';

    try {
        let user;
        try {
            user = await admin.auth().getUserByEmail(email);
            console.log(`User found: ${user.uid}`);
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                console.log(`User not found, creating user ${email}...`);
                user = await admin.auth().createUser({ email: email, password: newPassword, emailVerified: true });
                console.log(`Created user: ${user.uid}`);
            } else {
                throw e;
            }
        }

        await admin.auth().updateUser(user.uid, { password: newPassword, emailVerified: true });
        console.log(`Successfully updated password for ${email}`);

        const db = admin.firestore();
        await db.collection('users').doc(user.uid).set({
            email: email,
            role: 'admin',
            displayName: 'Admin Daitan',
            createdAt: new Date().toISOString()
        }, { merge: true });

        console.log(`Admin role confirmed in Firestore`);
        await admin.auth().setCustomUserClaims(user.uid, { admin: true, role: 'admin' });
        console.log(`Custom claims stored`);

    } catch (e) {
        console.error('Error:', e);
    }
}

setPassword().then(() => process.exit(0)).catch(() => process.exit(1));
