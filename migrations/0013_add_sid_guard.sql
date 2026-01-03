-- Add sid_guard column to capcut_accounts table
-- This stores the sid_guard cookie value directly in the database

ALTER TABLE capcut_accounts ADD COLUMN sid_guard TEXT;

-- Create index on sid_guard for faster lookups
CREATE INDEX IF NOT EXISTS idx_capcut_accounts_sid_guard ON capcut_accounts(sid_guard);

