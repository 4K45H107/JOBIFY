-- Job search: trigram similarity (ranking) and edit distance (typo tolerance).
-- Both ship with Postgres and are available on Neon.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
