const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2];
    if (val.startsWith('"') && val.endsWith('"')) { val = val.slice(1, -1); }
    env[match[1]] = val;
  }
});

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const credConfig = {
  projectId: env.FIREBASE_PROJECT_ID,
  clientEmail: env.FIREBASE_CLIENT_EMAIL,
  privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

const app = initializeApp({ credential: cert(credConfig) });
const auth = getAuth(app);

async function testReset() {
  try {
    const user = await auth.createUser({
      email: 'test_reset_flow_123@example.com',
      password: 'password123',
    });
    console.log('Created test user:', user.uid);
    const link = await auth.generatePasswordResetLink('test_reset_flow_123@example.com');
    console.log('RESET LINK:', link);
    await auth.deleteUser(user.uid);
    console.log('Deleted test user');
  } catch(e) {
    console.error('Error:', e.message);
  }
}
testReset();
