const fs = require('fs');
const path = require('path');

function viewLatestMetadata() {
    const filePath = path.join(__dirname, '..', 'photo_metadata_storage.json');
    if (!fs.existsSync(filePath)) {
        console.log('管理ファイルが見つかりません。アップロードを行うと作成されます。');
        return;
    }

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        console.log(`\n--- 最新のアップロードメタデータ (件数: ${data.length}) ---\n`);

        // 最新の5件を表示
        const latest = data.slice(0, 5);
        latest.forEach((entry, i) => {
            console.log(`[${i + 1}] ファイル: ${entry.fileName || entry.url.split('/').pop()}`);
            console.log(`    タイトル: ${entry.title || '(無題)'}`);
            console.log(`    撮影日: ${entry.shotAt || '(不明)'}`);
            console.log(`    カメラ: ${entry.exif?.Model || 'N/A'}`);
            console.log(`    レンズ: ${entry.exif?.LensModel || 'N/A'}`);
            console.log(`    URL: ${entry.url}`);
            console.log('-------------------------------------------');
        });

        if (data.length > 5) {
            console.log(`...他 ${data.length - 5} 件のデータが保存されています。`);
        }
    } catch (error) {
        console.error('読み込みエラー:', error);
    }
}

viewLatestMetadata();
