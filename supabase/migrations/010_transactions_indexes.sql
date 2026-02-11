-- Performance indexes for transactions table
-- Speeds up filtering by year (most common filter)
CREATE INDEX IF NOT EXISTS idx_transactions_rok ON transactions(rok);

-- Speeds up filtering by branch + date range
CREATE INDEX IF NOT EXISTS idx_transactions_oddzial_rok_miesiac ON transactions(oddzial, rok, miesiac);

-- Speeds up filtering/grouping by agent
CREATE INDEX IF NOT EXISTS idx_transactions_agent ON transactions(agent);
