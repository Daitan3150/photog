import fs from 'fs/promises';
import path from 'path';

/**
 * 写真のメタデータをローカルの管理ファイルに記録します。
 * WEB反映（Firestore）の内容をターミナル等で事後確認・管理するためのものです。
 */
export async function appendToMetadataRegistry(dataList: any[]) {
    try {
        const filePath = path.join(process.cwd(), 'photo_metadata_storage.json');
        let currentData = [];

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            currentData = JSON.parse(content);
        } catch (e) {
            // ファイルが存在しない場合は新規作成
        }

        // 新しいデータを先頭に追加（管理しやすいように）
        const timestamp = new Date().toISOString();
        const entriesWithTime = dataList.map(item => ({
            ...item,
            loggedAt: timestamp
        }));

        const combinedData = [...entriesWithTime, ...currentData].slice(0, 2000); // 最大2000件保持

        await fs.writeFile(filePath, JSON.stringify(combinedData, null, 2));
        return { success: true };
    } catch (error: any) {
        console.error('Metadata log error:', error);
        return { success: false, error: error.message };
    }
}
