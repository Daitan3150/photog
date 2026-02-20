import { algoliasearch, Algoliasearch } from 'algoliasearch';

// NEXT_PUBLIC prefixed for client-side search if needed
const getAppId = () => process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || '';
const getSearchKey = () => process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || '';
// Admin key for server-side indexing ONLY
const getAdminKey = () => process.env.ALGOLIA_ADMIN_KEY || '';

const INDEX_NAME = 'photos';

// Lazy client initialization to avoid timing issues with .env loading
let _searchClient: Algoliasearch | null = null;
export const getSearchClient = (): Algoliasearch => {
    if (!_searchClient) {
        const appId = getAppId();
        const searchKey = getSearchKey();
        if (!appId || !searchKey) {
            console.error('Algolia Search Key missing');
        }
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
            throw new Error('Algolia Admin Key missing. Ensure ALGOLIA_ADMIN_KEY is set.');
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
    location: string;
    category: string;
    tags: string[];
    shotAt: number;
    createdAt: number;
}

/**
 * Synchronize a photo to Algolia
 * Using Algolia v5 API (direct client mothods)
 */
export async function syncPhotoToAlgolia(
    photo: any,
    action: 'upsert' | 'delete' = 'upsert'
) {
    try {
        const client = getIndexClient();

        if (action === 'delete') {
            await client.deleteObject({
                indexName: INDEX_NAME,
                objectID: photo.id
            });
            return true;
        }

        const algoliaData: AlgoliaPhoto = {
            objectID: photo.id,
            title: photo.title || '',
            url: photo.url || '',
            subjectName: photo.subjectName || '',
            characterName: photo.characterName || '',
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

        // v5 uses saveObject on the client directly
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
 * Fetch related photos from Algolia based on tags and category
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

        // Build query components
        const filters = `NOT objectID:${photoId}`;
        const optionalFilters = [];

        // Boost same category
        if (category) {
            optionalFilters.push(`category:${category}`);
        }

        // Boost same tags
        tags.forEach(tag => {
            optionalFilters.push(`tags:${tag}`);
        });

        const { results } = await client.search({
            requests: [
                {
                    indexName: INDEX_NAME,
                    query: '', // We want discovery, not literal text match
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
