-- Add felo_user_token and expire_date columns to felo_accounts table
-- 
-- This migration adds cookie-related columns to track authentication tokens
-- and their expiration dates for Felo accounts.

-- Add felo_user_token column to store the cookie value
ALTER TABLE felo_accounts ADD COLUMN felo_user_token TEXT;

-- Add expire_date column to store the cookie expiration date
ALTER TABLE felo_accounts ADD COLUMN expire_date DATETIME;

-- Create index on expire_date for faster queries on expired cookies
CREATE INDEX IF NOT EXISTS idx_felo_accounts_expire_date ON felo_accounts(expire_date);
