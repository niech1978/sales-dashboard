-- Migration: Add koszty and kredyt columns to transactions table
-- Run this in Supabase SQL Editor
-- Koszty - obniżają prowizję
-- Kredyt - wraz z prowizją tworzą wykonanie (wykonanie = prowizja - koszty + kredyt)

-- 1. Add koszty column (costs that reduce commission)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS koszty DECIMAL(12,2) DEFAULT 0;

-- 2. Add kredyt column (credit - together with commission creates execution)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS kredyt DECIMAL(12,2) DEFAULT 0;

-- 3. Set default values for existing records
UPDATE transactions SET koszty = 0 WHERE koszty IS NULL;
UPDATE transactions SET kredyt = 0 WHERE kredyt IS NULL;

-- 4. Add comments for documentation
COMMENT ON COLUMN transactions.koszty IS 'Koszty transakcji - obniżają prowizję';
COMMENT ON COLUMN transactions.kredyt IS 'Kredyt - wraz z prowizją netto minus koszty tworzy wykonanie';
