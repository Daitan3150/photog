import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import { getApps } from 'firebase-admin/app';
import { AI_LAB_SEED_MEMORIES } from './ai-lab-memories.seed';

config({ path: '.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing Firebase configuration in .env.local');
    process.exit(1);
}

if (!getApps().length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

const db = admin.firestore();
const COLLECTION = 'ai_memories';

async function seedAiLabMemories() {
    const force = process.argv.includes('--force');
    const dryRun = process.argv.includes('--dry-run');

    const existing = await db.collection(COLLECTION).get();
    if (!existing.empty && !force) {
        console.log(`⚠️  ai_memories に ${existing.size} 件の記憶があります。`);
        console.log('   上書き追加する場合: npx tsx scripts/seed-ai-lab-memories.ts --force');
        console.log('   既存を残して不足分のみ追加する場合: --merge');
        if (!process.argv.includes('--merge')) {
            process.exit(0);
        }
    }

    const existingTitles = new Set(
        existing.docs.map(doc => (doc.data().title as string)?.trim()).filter(Boolean),
    );

    const toInsert = process.argv.includes('--merge')
        ? AI_LAB_SEED_MEMORIES.filter(item => !existingTitles.has(item.title))
        : AI_LAB_SEED_MEMORIES;

    if (toInsert.length === 0) {
        console.log('✅ 追加する新しい記憶はありません（すべて登録済み）。');
        return;
    }

    console.log(`${dryRun ? '[DRY RUN] ' : ''}${toInsert.length} 件の AI Lab 記憶を投入します...`);

    if (dryRun) {
        toInsert.forEach(item => console.log(`  - [${item.category}] ${item.title}`));
        return;
    }

    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    for (const memory of toInsert) {
        const ref = db.collection(COLLECTION).doc();
        batch.set(ref, {
            title: memory.title,
            content: memory.content,
            category: memory.category,
            priority: memory.priority,
            createdAt: now,
            updatedAt: now,
            seeded: true,
        });
    }

    await batch.commit();
    console.log(`✅ ${toInsert.length} 件の記憶を AI Lab に保存しました。`);
    console.log('   管理画面: /admin/ai-lab で確認できます。');
}

seedAiLabMemories().catch(error => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
});
