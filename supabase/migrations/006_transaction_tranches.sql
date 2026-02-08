-- Migration: Transze transakcji (prognoza prowizji)
-- Umozliwia podzial prowizji z jednej transakcji na kilka miesiecy
-- Run this in Supabase SQL Editor

-- 1. Tabela transaction_tranches
CREATE TABLE IF NOT EXISTS transaction_tranches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    miesiac INTEGER NOT NULL CHECK (miesiac >= 1 AND miesiac <= 12),
    rok INTEGER NOT NULL,
    kwota DECIMAL(12,2) NOT NULL CHECK (kwota >= 0),
    status TEXT NOT NULL DEFAULT 'prognoza' CHECK (status IN ('zrealizowana', 'prognoza')),
    prawdopodobienstwo INTEGER NOT NULL DEFAULT 50 CHECK (prawdopodobienstwo >= 0 AND prawdopodobienstwo <= 100),
    notatka TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indeksy
CREATE INDEX IF NOT EXISTS idx_tranches_transaction_id ON transaction_tranches(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tranches_rok_miesiac ON transaction_tranches(rok, miesiac);

-- 3. Trigger: gdy status = 'zrealizowana' -> prawdopodobienstwo auto-set 100
CREATE OR REPLACE FUNCTION set_tranche_prawdopodobienstwo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'zrealizowana' THEN
        NEW.prawdopodobienstwo := 100;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tranche_status_trigger ON transaction_tranches;
CREATE TRIGGER tranche_status_trigger
    BEFORE INSERT OR UPDATE ON transaction_tranches
    FOR EACH ROW
    EXECUTE FUNCTION set_tranche_prawdopodobienstwo();

-- 4. Trigger: updated_at
DROP TRIGGER IF EXISTS update_tranches_updated_at ON transaction_tranches;
CREATE TRIGGER update_tranches_updated_at
    BEFORE UPDATE ON transaction_tranches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS
ALTER TABLE transaction_tranches ENABLE ROW LEVEL SECURITY;

-- Odczyt: lustrzane do transactions (admin widzi wszystko, manager swoj oddzial przez JOIN)
CREATE POLICY "Users can view tranches of visible transactions"
ON transaction_tranches FOR SELECT
USING (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR EXISTS (
            SELECT 1 FROM transactions t
            WHERE t.id = transaction_tranches.transaction_id
            AND t.oddzial = get_user_oddzial()
        )
    )
);

-- Dodawanie: admin/manager (manager tylko swoj oddzial)
CREATE POLICY "Admins and managers can insert tranches"
ON transaction_tranches FOR INSERT
WITH CHECK (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR (get_user_role() = 'manager' AND EXISTS (
            SELECT 1 FROM transactions t
            WHERE t.id = transaction_tranches.transaction_id
            AND t.oddzial = get_user_oddzial()
        ))
    )
);

-- Aktualizacja: admin/manager
CREATE POLICY "Admins and managers can update tranches"
ON transaction_tranches FOR UPDATE
USING (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR (get_user_role() = 'manager' AND EXISTS (
            SELECT 1 FROM transactions t
            WHERE t.id = transaction_tranches.transaction_id
            AND t.oddzial = get_user_oddzial()
        ))
    )
);

-- Usuwanie: admin lub manager swojego oddzialu
CREATE POLICY "Admins and managers can delete tranches"
ON transaction_tranches FOR DELETE
USING (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR (get_user_role() = 'manager' AND EXISTS (
            SELECT 1 FROM transactions t
            WHERE t.id = transaction_tranches.transaction_id
            AND t.oddzial = get_user_oddzial()
        ))
    )
);
