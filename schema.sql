-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on name for faster searches
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);

-- Insert sample data
INSERT INTO items (name, description) VALUES
  ('Sample Item 1', 'This is a sample item'),
  ('Sample Item 2', 'Another sample item');

