import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.warn('⚠️ DATABASE_URL is not defined. Neon features will be unavailable.');
}

// Lazy initialization or conditional export
export const db = databaseUrl
    ? drizzle(neon(databaseUrl), { schema })
    : null as any; // Fallback to null, actions should handle this

export type DbClient = typeof db;
