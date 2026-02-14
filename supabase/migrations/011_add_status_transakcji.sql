-- Add statusTransakcji column to transactions table
-- Values: 'zrealizowana' (default) or 'prognozowana'
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS "statusTransakcji" text DEFAULT 'zrealizowana'
CHECK ("statusTransakcji" IN ('zrealizowana', 'prognozowana'));

-- Set all existing transactions to 'zrealizowana'
UPDATE transactions SET "statusTransakcji" = 'zrealizowana' WHERE "statusTransakcji" IS NULL;
