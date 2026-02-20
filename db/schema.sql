-- Photo statistics
CREATE TABLE IF NOT EXISTS photo_stats (
  id TEXT PRIMARY KEY,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Site metadata/counters
CREATE TABLE IF NOT EXISTS site_meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_photo_stats_updated ON photo_stats(updated_at);

-- Virtual table for Full-Text Search (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS photo_search_index USING fts5(
  id UNINDEXED,
  content,
  tokenize = "unicode61"
);

-- Metadata table for rich search results (thumbnails, titles)
CREATE TABLE IF NOT EXISTS photo_metadata (
  id TEXT PRIMARY KEY,
  title TEXT,
  url TEXT,
  subject_name TEXT,
  character_name TEXT,
  location TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
