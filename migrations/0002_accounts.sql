-- Create felo_accounts table for storing felo.ai account information
CREATE TABLE IF NOT EXISTS felo_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'created',
  error TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_felo_accounts_email ON felo_accounts(email);

-- Create index on status
CREATE INDEX IF NOT EXISTS idx_felo_accounts_status ON felo_accounts(status);

