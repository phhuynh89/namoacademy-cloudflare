-- Create boomlify_api_keys table for managing Boomlify API keys with daily credits
CREATE TABLE IF NOT EXISTS boomlify_api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key TEXT NOT NULL UNIQUE,
  name TEXT,
  credits INTEGER DEFAULT 50,
  last_reset DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on api_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_boomlify_api_keys_key ON boomlify_api_keys(api_key);

-- Create index on last_reset for efficient daily reset queries
CREATE INDEX IF NOT EXISTS idx_boomlify_api_keys_last_reset ON boomlify_api_keys(last_reset);

