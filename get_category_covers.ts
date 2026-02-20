import { getAdminFirestore } from './src/lib/firebaseAdmin';

async function main() {
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection('categories').orderBy('order', 'asc').get();
    console.log('--- Categories and Cover Images ---');
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`Name: ${data.name}`);
      console.log(`Cover URL: ${data.coverUrl || 'No image set'}`);
      console.log('-----------------------------------');
    });
  } catch (e: any) {
    console.log('Error fetching categories:', e.message);
  }
}

main();
