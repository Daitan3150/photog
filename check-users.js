
import { getAdminFirestore } from './src/lib/firebaseAdmin.js';

async function listUsers() {
    try {
        const db = getAdminFirestore();
        const users = await db.collection('users').get();
        users.forEach(doc => {
            console.log(doc.id, '=>', doc.data());
        });
    } catch (e) {
        console.error(e);
    }
}

listUsers();
