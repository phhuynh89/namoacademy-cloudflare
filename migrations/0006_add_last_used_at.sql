-- Add last_used_at column to felo_accounts table
-- 
-- This column tracks when an account was last selected to prevent
-- duplicate account selection when multiple requests come in simultaneously.

-- Add last_used_at column to track when account was last selected
ALTER TABLE felo_accounts ADD COLUMN last_used_at DATETIME;

-- Create index on last_used_at for faster queries
CREATE INDEX IF NOT EXISTS idx_felo_accounts_last_used_at ON felo_accounts(last_used_at);

