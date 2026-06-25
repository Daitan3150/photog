import * as admin from 'firebase-admin';

async function syncSubjects() {
    console.log('Starting subject sync...');

    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            })
        });
    }

    const db = admin.firestore();
    
    // 1. Fetch all photos
    const photosSnapshot = await db.collection('photos').get();
    const photoSubjects = new Set<string>();
    
    photosSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.subjectName) {
            photoSubjects.add(data.subjectName.trim());
        }
    });
    
    console.log(`Found ${photoSubjects.size} unique subject names in photos.`);

    // 2. Fetch all users
    const usersSnapshot = await db.collection('users').get();
    const existingUsers = new Set<string>();
    usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.displayName) existingUsers.add(data.displayName.trim());
    });

    // 3. Fetch all subjects
    const subjectsSnapshot = await db.collection('subjects').get();
    const existingSubjects = new Set<string>();
    subjectsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.name) existingSubjects.add(data.name.trim());
    });
    
    console.log(`Found ${existingUsers.size} users and ${existingSubjects.size} subjects.`);

    let addedCount = 0;
    
    // 4. Check and add missing subjects
    for (const subjectName of photoSubjects) {
        if (!subjectName) continue;
        
        if (!existingUsers.has(subjectName) && !existingSubjects.has(subjectName)) {
            console.log(`Missing subject found: ${subjectName}. Adding to subjects collection...`);
            await db.collection('subjects').add({
                name: subjectName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            existingSubjects.add(subjectName);
            addedCount++;
        }
    }
    
    console.log(`Done! Added ${addedCount} new subjects.`);
    process.exit(0);
}

syncSubjects().catch(console.error);
