const admin = require('firebase-admin');
const fs = require('fs');

// Read from .env.local.temp manually to be sure
const envContent = fs.readFileSync('.env.local.temp', 'utf8');
const getVal = (key) => {
    const match = envContent.match(new RegExp(`${key}="(.*)"`));
    return match ? match[1] : null;
};

const projectId = getVal('FIREBASE_PROJECT_ID');
const clientEmail = getVal('FIREBASE_CLIENT_EMAIL');
const privateKey = getVal('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');

console.log('Project ID:', projectId);
console.log('Client Email:', clientEmail);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
        }),
    });
}

async function test() {
    try {
        const listUsers = await admin.auth().listUsers(1);
        console.log('Success! Found', listUsers.users.length, 'users.');
        process.exit(0);
    } catch (e) {
        console.error('Failed:', e.code, e.message);
        process.exit(1);
    }
}

test();
