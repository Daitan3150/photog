import { algoliasearch, Algoliasearch } from 'algoliasearch';

// NEXT_PUBLIC prefixed for client-side search if needed
const getAppId = () => process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || '';
const getSearchKey = () => process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || '';
// Admin key for server-side indexing ONLY
const getAdminKey = () => process.env.ALGOLIA_ADMIN_KEY || '';

const INDEX_NAME = 'photos';

// Lazy client initialization
let _searchClient: Algoliasearch | null = null;
export const getSearchClient = (): Algoliasearch => {
    if (!_searchClient) {
        const appId = getAppId();
        const searchKey = getSearchKey();
        _searchClient = algoliasearch(appId, searchKey);
    }
    return _searchClient;
};

let _indexClient: Algoliasearch | null = null;
export const getIndexClient = (): Algoliasearch => {
    if (!_indexClient) {
        const appId = getAppId();
        const adminKey = getAdminKey();
        if (!appId || !adminKey) {
            throw new Error('Algolia Admin Key missing');
        }
        _indexClient = algoliasearch(appId, adminKey);
    }
    return _indexClient;
};

export interface AlgoliaPhoto {
    objectID: string;
    title: string;
    url: string;
    subjectName: string;
    characterName: string;
    event: string;
    location: string;
    category: string;
    tags: string[];
    shotAt: number;
    createdAt: number;
}

/**
 * Synchronize a photo to Algolia
 */
export async function syncPhotoToAlgolia(
    photo: any,
    action: 'upsert' | 'delete' = 'upsert'
) {
    try {
        const client = getIndexClient();

        if (action === 'delete' || photo.category === 'archived' || photo.categoryId === 'archived') {
            await client.deleteObject({
                indexName: INDEX_NAME,
                objectID: photo.id || photo.objectID
            });
            return true;
        }

        const algoliaData: AlgoliaPhoto = {
            objectID: photo.id,
            title: photo.title || '',
            url: photo.url || '',
            subjectName: photo.subjectName || '',
            characterName: photo.characterName || '',
            event: photo.event || '',
            location: photo.location || '',
            category: photo.category || '',
            tags: photo.tags || [],
            shotAt:
                photo.shotAt instanceof Date
                    ? photo.shotAt.getTime()
                    : typeof photo.shotAt === 'string'
                        ? new Date(photo.shotAt).getTime()
                        : photo.shotAt || 0,
            createdAt:
                photo.createdAt instanceof Date
                    ? photo.createdAt.getTime()
                    : typeof photo.createdAt === 'string'
                        ? new Date(photo.createdAt).getTime()
                        : photo.createdAt || 0,
        };

        await client.saveObject({
            indexName: INDEX_NAME,
            body: algoliaData
        });
        return true;
    } catch (error) {
        console.error('Algolia Sync Error:', error);
        return false;
    }
}

/**
 * Fetch related photos from Algolia
 */
export async function getRelatedPhotos(params: {
    photoId: string;
    category?: string;
    tags?: string[];
    limit?: number;
}) {
    const { photoId, category, tags = [], limit = 4 } = params;

    try {
        const client = getSearchClient();
        const filters = `NOT objectID:${photoId} AND NOT category:archived`;
        const optionalFilters = [];
        if (category) optionalFilters.push(`category:${category}`);
        tags.forEach(tag => optionalFilters.push(`tags:${tag}`));

        const { results } = await client.search({
            requests: [
                {
                    indexName: INDEX_NAME,
                    query: '',
                    filters: filters,
                    optionalFilters: optionalFilters,
                    hitsPerPage: limit,
                }
            ]
        });

        return (results[0] as any).hits || [];
    } catch (error) {
        console.error('Algolia Related Photos Error:', error);
        return [];
    }
}
