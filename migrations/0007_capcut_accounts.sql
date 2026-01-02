-- Create capcut_accounts table for storing CapCut account information
CREATE TABLE IF NOT EXISTS capcut_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'created',
  error TEXT,
  login_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_capcut_accounts_email ON capcut_accounts(email);

-- Create index on status
CREATE INDEX IF NOT EXISTS idx_capcut_accounts_status ON capcut_accounts(status);

