import { pgTable, text, timestamp, uuid, jsonb, doublePrecision, boolean, integer, primaryKey } from 'drizzle-orm/pg-core';

/**
 * 📸 写真テーブル
 */
export const photos = pgTable('photos', {
    id: text('id').primaryKey(), // Firestore の ID と同期させる
    uploaderId: text('uploader_id').notNull(),
    url: text('url').notNull(),
    publicId: text('public_id').notNull(),
    title: text('title'),
    subjectName: text('subject_name'),
    location: text('location'),
    characterName: text('character_name'),
    shotAt: timestamp('shot_at'),
    snsUrl: text('sns_url'),
    categoryId: text('category_id'),
    displayMode: text('display_mode', { enum: ['title', 'character'] }).default('title').notNull(),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    exif: jsonb('exif'),
    exifRequest: boolean('exif_request').default(false).notNull(),
    focalPoint: jsonb('focal_point'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 👤 被写体（モデル・レイヤー）テーブル
 */
export const subjects = pgTable('subjects', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull().unique(),
    snsUrl: text('sns_url'),
    autoRegistered: boolean('auto_registered').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 🏷️ タグテーブル
 */
export const tags = pgTable('tags', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull().unique(),
});

/**
 * 🔗 写真とタグの中間テーブル（多対多）
 */
export const photoTags = pgTable('photo_tags', {
    photoId: text('photo_id').notNull().references(() => photos.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({
    pk: primaryKey({ columns: [t.photoId, t.tagId] }),
}));
