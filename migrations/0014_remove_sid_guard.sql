-- Remove sid_guard column from capcut_accounts table
-- Cookies are now stored in R2 as JSON files, and sid_guard is no longer needed in the database

-- Drop the index first
DROP INDEX IF EXISTS idx_capcut_accounts_sid_guard;

-- For SQLite/D1, we need to recreate the table to remove the column
-- since SQLite doesn't support ALTER TABLE DROP COLUMN directly

-- Step 1: Create new table without sid_guard
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

-- Step 2: Copy data from old table to new table (excluding sid_guard)
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

