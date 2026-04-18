-- Table for monthly cuts data
CREATE TABLE IF NOT EXISTS cuts_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total INTEGER,
  daily_cuts JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, year, month)
);

-- Enable Row Level Security
ALTER TABLE cuts_data ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon key (public dashboard)
CREATE POLICY "Allow all for anon" ON cuts_data
  FOR ALL USING (true) WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_cuts_data_store_year_month ON cuts_data(store_id, year, month);
