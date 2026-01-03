-- Add cookie_file_url column to capcut_accounts table
-- This stores the R2 URL where the cookie JSON file is stored
ALTER TABLE capcut_accounts ADD COLUMN cookie_file_url TEXT;

-- Create index on cookie_file_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_capcut_accounts_cookie_file_url ON capcut_accounts(cookie_file_url);

