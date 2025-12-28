-- Add login_at and credits columns to felo_accounts table
ALTER TABLE felo_accounts ADD COLUMN login_at DATETIME;
ALTER TABLE felo_accounts ADD COLUMN credits INTEGER DEFAULT 200;

