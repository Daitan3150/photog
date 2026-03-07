const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2];
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
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

auth.getUserByEmail('new.sasuke.sakura@gmail.com').then(user => {
  console.log('User exists:', user.uid);
}).catch(err => {
  console.error('Error finding user:', err.code);
});
auth.getUserByEmail('daitan10618@icloud.com').then(user => {
  console.log('User 2 exists:', user.uid);
}).catch(err => {
  console.error('Error finding user 2:', err.code);
});
