-- Add last_used_at column to capcut_accounts table for duplicate prevention
ALTER TABLE capcut_accounts ADD COLUMN last_used_at DATETIME;

-- Create index on last_used_at for faster lookups
CREATE INDEX IF NOT EXISTS idx_capcut_accounts_last_used_at ON capcut_accounts(last_used_at);

