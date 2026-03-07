import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const config = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

const app = initializeApp({
  credential: cert(config)
});
const db = getFirestore(app);
const auth = getAuth(app);

async function check() {
  const users = await db.collection('users').get();
  console.log("Users in Firestore:");
  users.forEach(doc => {
    console.log(doc.id, doc.data());
  });
  
  const authUsers = await auth.listUsers();
  console.log("Users in Auth:");
  authUsers.users.forEach(user => {
      console.log(user.uid, user.email, user.providerData.map(p => p.providerId));
  });
}
check().catch(console.error);
