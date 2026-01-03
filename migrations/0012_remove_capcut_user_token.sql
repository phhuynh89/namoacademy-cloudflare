-- Remove capcut_user_token column from capcut_accounts table
-- This column is no longer needed as we now store cookie files in R2

-- Drop the column (SQLite doesn't support DROP COLUMN directly, so we need to recreate the table)
-- Note: This is a destructive operation. Make sure to backup data if needed.

-- For SQLite, we'll use a workaround to remove the column
-- Since SQLite doesn't support ALTER TABLE DROP COLUMN, we'll create a new table without the column
-- and copy the data over

-- Step 1: Create new table without capcut_user_token
CREATE TABLE IF NOT EXISTS capcut_accounts_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'created',
  error TEXT,
  login_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  credits INTEGER DEFAULT 10,
  last_used_at DATETIME,
  expire_date DATETIME,
  cookie_file_url TEXT
);

-- Step 2: Copy data from old table to new table (excluding capcut_user_token)
INSERT INTO capcut_accounts_new (
  id, email, password, created_at, status, error, login_at, updated_at, 
  credits, last_used_at, expire_date, cookie_file_url
)
SELECT 
  id, email, password, created_at, status, error, login_at, updated_at,
  credits, last_used_at, expire_date, cookie_file_url
FROM capcut_accounts;

-- Step 3: Drop old table
DROP TABLE capcut_accounts;

-- Step 4: Rename new table to original name
ALTER TABLE capcut_accounts_new RENAME TO capcut_accounts;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_capcut_accounts_email ON capcut_accounts(email);
CREATE INDEX IF NOT EXISTS idx_capcut_accounts_status ON capcut_accounts(status);
CREATE INDEX IF NOT EXISTS idx_capcut_accounts_last_used_at ON capcut_accounts(last_used_at);
CREATE INDEX IF NOT EXISTS idx_capcut_accounts_expire_date ON capcut_accounts(expire_date);
CREATE INDEX IF NOT EXISTS idx_capcut_accounts_cookie_file_url ON capcut_accounts(cookie_file_url);

