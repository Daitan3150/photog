import { Env, PhotoData } from './types';

export async function syncPhotosToAlgolia(env: Env, photos: any[]) {
    const appId = env.ALGOLIA_APP_ID;
    const adminKey = env.ALGOLIA_ADMIN_KEY;
    const indexName = 'photos';

    const url = `https://${appId}.algolia.net/1/indexes/${indexName}/batch`;

    const requests = photos.map(photo => ({
        action: 'updateObject', // update or create
        body: {
            objectID: photo.id,
            ...photo
        }
    }));

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'X-Algolia-API-Key': adminKey,
            'X-Algolia-Application-Id': appId,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`Algolia sync failed: ${text}`);
        // Don't throw, just log. Algolia sync is secondary.
    }
}
