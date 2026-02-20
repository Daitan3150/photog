/**
 * Utility to configure Algolia index settings
 * Usage: npx tsx src/lib/algolia-configure.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { getIndexClient } from './algolia';

const INDEX_NAME = 'photos';

async function configure() {
    console.log(`⚙️ Configuring Algolia index: ${INDEX_NAME}...`);

    try {
        const client = getIndexClient();

        // Update settings
        // ref: https://www.algolia.com/doc/api-reference/api-methods/set-settings/
        await client.setSettings({
            indexName: INDEX_NAME,
            indexSettings: {
                // Attributes used for searching, in order of importance
                searchableAttributes: [
                    'title',
                    'characterName',
                    'subjectName',
                    'location',
                    'category',
                    'tags',
                ],
                // Attributes for filtering (faceting)
                attributesForFaceting: [
                    'category', // For UI refinement
                    'location', // For UI refinement
                    'tags',     // For UI refinement
                    'filterOnly(objectID)', // For excluding current photo in recommendations
                ],
                // Custom ranking
                customRanking: [
                    'desc(createdAt)',
                ],
                // Highlighting strings
                highlightPreTag: '<mark>',
                highlightPostTag: '</mark>',
            }
        });

        console.log('✅ Algolia settings updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to update Algolia settings:', error);
        process.exit(1);
    }
}

configure();
