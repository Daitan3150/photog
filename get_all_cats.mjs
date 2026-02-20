import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import fs from 'fs';

const env = dotenv.parse(fs.readFileSync('.env.local'));
process.env = { ...process.env, ...env };

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('categories').get();
  let output = '';
  snapshot.forEach(doc => {
    const data = doc.data();
    output += `${data.name} (${doc.id}): ${data.coverUrl || '(No image)'}\n`;
  });
  fs.writeFileSync('category_urls.txt', output);
}
run();
