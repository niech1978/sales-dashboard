-- Migration: Add agent_performance and branch_targets tables
-- Run this in Supabase SQL Editor

-- 1. Agent Performance Table - Podsumowanie wydajności agentów
CREATE TABLE IF NOT EXISTS agent_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_name TEXT NOT NULL,
    oddzial TEXT NOT NULL,
    rok INTEGER NOT NULL,
    miesiac INTEGER, -- NULL = cały rok
    prowizja_netto_kredyt DECIMAL(12,2) DEFAULT 0,
    spotkania_pozyskowe INTEGER DEFAULT 0,
    nowe_umowy INTEGER DEFAULT 0,
    prezentacje INTEGER DEFAULT 0,
    mieszkania INTEGER DEFAULT 0,
    domy INTEGER DEFAULT 0,
    dzialki INTEGER DEFAULT 0,
    inne INTEGER DEFAULT 0,
    suma_nieruchomosci INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_name, oddzial, rok, miesiac)
);

-- 2. Branch Targets Table - Plany miesięczne oddziałów
CREATE TABLE IF NOT EXISTS branch_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    oddzial TEXT NOT NULL,
    rok INTEGER NOT NULL,
    miesiac INTEGER NOT NULL,
    plan_kwota DECIMAL(12,2) DEFAULT 0,
    wykonanie_kwota DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(oddzial, rok, miesiac)
);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_targets ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for authenticated users
CREATE POLICY "Allow all for authenticated users" ON agent_performance
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON branch_targets
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Create policies for anon users (read-only)
CREATE POLICY "Allow read for anon" ON agent_performance
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow read for anon" ON branch_targets
    FOR SELECT TO anon USING (true);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_performance_agent ON agent_performance(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_performance_oddzial ON agent_performance(oddzial);
CREATE INDEX IF NOT EXISTS idx_agent_performance_rok ON agent_performance(rok);
CREATE INDEX IF NOT EXISTS idx_branch_targets_oddzial_rok ON branch_targets(oddzial, rok);

-- 7. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger for agent_performance
DROP TRIGGER IF EXISTS update_agent_performance_updated_at ON agent_performance;
CREATE TRIGGER update_agent_performance_updated_at
    BEFORE UPDATE ON agent_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
