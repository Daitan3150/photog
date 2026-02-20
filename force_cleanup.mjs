
import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        console.error('❌ エラー: .env.local に Firebase の認証情報が見つかりません。');
        process.exit(1);
    }

    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
            projectId
        });
    }

    const db = admin.firestore();
    // 名寄せの基準となる正表記
    const CORRECT_LENS = 'voigtlander NOKTON classic 40mm F1.4 SC';
    // 判定用パターン（これらに合致する40mmレンズはすべて正表記に統合）
    const PATTERN = /voigtlander|nokton|40mm/i;

    console.log('--- 1. プロフィールの修正を開始 ---');
    const profileRef = db.collection('settings').doc('profile');
    const profileDoc = await profileRef.get();

    if (profileDoc.exists) {
        const data = profileDoc.data();
        let updated = false;

        const fixList = (list) => {
            if (!list) return list;
            return list.map(item => {
                if (typeof item === 'string' && PATTERN.test(item) && item.includes('40mm')) {
                    if (item !== CORRECT_LENS) {
                        console.log(`  [Profile] 置換: "${item}" -> "${CORRECT_LENS}"`);
                        updated = true;
                        return CORRECT_LENS;
                    }
                }
                return item;
            });
        };

        if (data.lenses) data.lenses = fixList(data.lenses);
        if (data.gear) data.gear = fixList(data.gear);

        if (updated) {
            await profileRef.update({
                lenses: data.lenses,
                gear: data.gear,
                updatedAt: new Date().toISOString()
            });
            console.log('✅ プロフィールの修正が完了しました。');
        } else {
            console.log('ℹ️ プロフィールは既に修正済みか、対象がありません。');
        }
    }

    console.log('\n--- 2. 写真データの修正を開始 ---');
    const snapshot = await db.collection('photos').get();
    let count = 0;

    for (const doc of snapshot.docs) {
        const exif = doc.data().exif;
        if (exif && exif.LensModel) {
            const currentLens = exif.LensModel.trim();
            if (PATTERN.test(currentLens) && currentLens.includes('40mm') && currentLens !== CORRECT_LENS) {
                console.log(`  [Photo] ID: ${doc.id} を修正: "${currentLens}" -> "${CORRECT_LENS}"`);
                await doc.ref.update({ 'exif.LensModel': CORRECT_LENS });
                count++;
            }
        }
    }

    console.log(`\n✅ 写真データ: ${count} 枚を修正しました。`);
    console.log('--- すべてのクリーンアップ作業が完了しました ---');
}

run().catch(error => {
    console.error('\n❌ 実行中にエラーが発生しました:');
    console.error(error);
    process.exit(1);
});
