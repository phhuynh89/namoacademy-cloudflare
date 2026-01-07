-- Add status column to boomlify_api_keys table
ALTER TABLE boomlify_api_keys ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_boomlify_api_keys_status ON boomlify_api_keys(status);

