-- Add login_at and credits columns to felo_accounts table
-- 
-- NOTE: Migration 0002 has been updated to include login_at and credits columns
-- in the CREATE TABLE statement. This migration is kept for backward compatibility
-- with databases created before that update.
--
-- For fresh databases: Migration 0002 creates the table WITH these columns,
-- so this migration will attempt to add them again and fail (duplicate column).
-- This is expected and safe - the migration system handles duplicate column errors.
--
-- For existing databases: If the table exists without these columns, this migration adds them.
-- If the table doesn't exist, migration 0002 will create it with these columns.

-- Attempt to add columns
-- Will succeed if table exists and columns don't exist (old databases)
-- Will fail if columns already exist (new databases with updated 0002) - this is expected
-- Will fail if table doesn't exist - this means 0002 needs to run first
ALTER TABLE felo_accounts ADD COLUMN login_at DATETIME;
ALTER TABLE felo_accounts ADD COLUMN credits INTEGER DEFAULT 200;
