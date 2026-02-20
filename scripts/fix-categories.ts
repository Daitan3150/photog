import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import { getApps } from 'firebase-admin/app';

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
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
}

const db = admin.firestore();

// 正規カテゴリー定義（これが正解）
// ID は slug、name は表示名
const CANONICAL_CATEGORIES = [
    { id: 'cosplay', name: 'コスプレ撮影', order: 1 },
    { id: 'portrait', name: 'ポートレート', order: 2 },
    { id: 'snapshot', name: 'スナップ撮影', order: 3 },
    { id: 'landscape', name: '風景写真', order: 4 },
    { id: 'animal', name: '動物の写真', order: 5 },
];

// 削除すべき重複カテゴリーの名前パターン（正規以外）
// → 「スナップ」「snap」「Snap」など
const DUPLICATE_NAMES = ['スナップ', 'snap', 'Snap', 'Snapshot', 'SNAPSHOT'];
// 削除すべき重複カテゴリーのID（正規ID以外）
const DUPLICATE_IDS = ['snap'];

async function fixCategories() {
    console.log('🔍 Fetching all categories...');
    const snapshot = await db.collection('categories').get();

    console.log(`\n📋 Found ${snapshot.size} categories:`);
    const allCats: { id: string; name: string; order: number }[] = [];
    snapshot.docs.forEach(doc => {
        const d = doc.data();
        console.log(`  - [${doc.id}] "${d.name}" (order: ${d.order})`);
        allCats.push({ id: doc.id, name: d.name, order: d.order });
    });

    // 正規カテゴリーIDのセット
    const canonicalIds = new Set(CANONICAL_CATEGORIES.map(c => c.id));

    // 削除対象: 正規IDに含まれない、かつ重複名またはIDに一致するもの
    const toDelete = allCats.filter(cat =>
        !canonicalIds.has(cat.id) &&
        (
            DUPLICATE_IDS.includes(cat.id) ||
            DUPLICATE_NAMES.includes(cat.name) ||
            DUPLICATE_NAMES.some(n => cat.name.includes(n))
        )
    );

    if (toDelete.length === 0) {
        console.log('\n✅ 重複カテゴリーは見つかりませんでした。');
    } else {
        console.log(`\n🗑️  削除対象 (${toDelete.length}件):`);
        toDelete.forEach(cat => console.log(`  - [${cat.id}] "${cat.name}"`));

        // 削除対象カテゴリーを参照している写真を正規カテゴリーに移行
        for (const dupCat of toDelete) {
            // 対応する正規カテゴリーを探す（snapshot → snapshot）
            const canonical = CANONICAL_CATEGORIES.find(c =>
                c.name === dupCat.name ||
                c.id === dupCat.id ||
                dupCat.name.includes('スナップ') && c.id === 'snapshot'
            );
            const newCategoryId = canonical?.id || 'snapshot';

            console.log(`\n  📦 [${dupCat.id}] の写真を [${newCategoryId}] に移行中...`);
            const photosSnap = await db.collection('photos')
                .where('categoryId', '==', dupCat.id)
                .get();

            if (photosSnap.size > 0) {
                const batch = db.batch();
                photosSnap.docs.forEach(doc => {
                    batch.update(doc.ref, { categoryId: newCategoryId, updatedAt: new Date() });
                });
                await batch.commit();
                console.log(`  ✅ ${photosSnap.size}枚の写真を移行しました。`);
            } else {
                console.log(`  ℹ️  このカテゴリーの写真はありません。`);
            }

            // カテゴリー削除
            await db.collection('categories').doc(dupCat.id).delete();
            console.log(`  🗑️  カテゴリー [${dupCat.id}] を削除しました。`);
        }
    }

    // 正規カテゴリーを upsert（存在しない場合は作成）
    console.log('\n🔧 正規カテゴリーを確認・更新中...');
    const batch = db.batch();
    for (const cat of CANONICAL_CATEGORIES) {
        const ref = db.collection('categories').doc(cat.id);
        batch.set(ref, {
            name: cat.name,
            order: cat.order,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    await batch.commit();
    console.log('✅ 正規カテゴリーを更新しました。');

    console.log('\n🎉 完了！');
}

fixCategories().catch(err => {
    console.error('❌ エラー:', err);
    process.exit(1);
});
