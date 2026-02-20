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
  const collections = await db.listCollections();
  let output = '--- ALL COLLECTIONS ---\n';
  for (const col of collections) {
    output += `Collection: ${col.id}\n`;
    const snapshot = await col.limit(1).get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      output += `Sample [${doc.id}]: ${JSON.stringify(doc.data(), null, 2)}\n`;
    }
    output += '-----------------------\n';
  }
  fs.writeFileSync('output_collections.txt', output);
}
run().catch(e => fs.writeFileSync('output_collections.txt', e.stack));
