-- Add capcut_user_token and expire_date columns to capcut_accounts table
-- 
-- This migration adds cookie-related columns to track authentication tokens
-- and their expiration dates for CapCut accounts.

-- Add capcut_user_token column to store the cookie value
ALTER TABLE capcut_accounts ADD COLUMN capcut_user_token TEXT;

-- Add expire_date column to store the cookie expiration date
ALTER TABLE capcut_accounts ADD COLUMN expire_date DATETIME;

-- Create index on expire_date for faster queries on expired cookies
CREATE INDEX IF NOT EXISTS idx_capcut_accounts_expire_date ON capcut_accounts(expire_date);

