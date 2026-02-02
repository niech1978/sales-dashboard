-- =====================================================
-- PROSTY RLS - tylko zalogowani użytkownicy
-- Uruchom ten skrypt jeśli chcesz prostszą konfigurację
-- =====================================================

-- 1. WŁĄCZENIE RLS NA WSZYSTKICH TABELACH
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_targets ENABLE ROW LEVEL SECURITY;

-- 2. POLITYKI - ODCZYT DLA ZALOGOWANYCH
-- =====================================================

-- Transactions - odczyt dla zalogowanych
DROP POLICY IF EXISTS "Allow read for authenticated" ON transactions;
CREATE POLICY "Allow read for authenticated"
ON transactions FOR SELECT
TO authenticated
USING (true);

-- Transactions - zapis dla zalogowanych
DROP POLICY IF EXISTS "Allow insert for authenticated" ON transactions;
CREATE POLICY "Allow insert for authenticated"
ON transactions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Transactions - aktualizacja dla zalogowanych
DROP POLICY IF EXISTS "Allow update for authenticated" ON transactions;
CREATE POLICY "Allow update for authenticated"
ON transactions FOR UPDATE
TO authenticated
USING (true);

-- Transactions - usuwanie dla zalogowanych
DROP POLICY IF EXISTS "Allow delete for authenticated" ON transactions;
CREATE POLICY "Allow delete for authenticated"
ON transactions FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- Agent Performance
-- =====================================================

DROP POLICY IF EXISTS "Allow read for authenticated" ON agent_performance;
CREATE POLICY "Allow read for authenticated"
ON agent_performance FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated" ON agent_performance;
CREATE POLICY "Allow insert for authenticated"
ON agent_performance FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated" ON agent_performance;
CREATE POLICY "Allow update for authenticated"
ON agent_performance FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow delete for authenticated" ON agent_performance;
CREATE POLICY "Allow delete for authenticated"
ON agent_performance FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- Branch Targets
-- =====================================================

DROP POLICY IF EXISTS "Allow read for authenticated" ON branch_targets;
CREATE POLICY "Allow read for authenticated"
ON branch_targets FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated" ON branch_targets;
CREATE POLICY "Allow insert for authenticated"
ON branch_targets FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated" ON branch_targets;
CREATE POLICY "Allow update for authenticated"
ON branch_targets FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow delete for authenticated" ON branch_targets;
CREATE POLICY "Allow delete for authenticated"
ON branch_targets FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- KONIEC
-- =====================================================
-- Teraz tylko zalogowani użytkownicy (przez Supabase Auth)
-- mogą odczytywać i modyfikować dane.
--
-- Użytkownicy tworzeni są w:
-- Supabase Dashboard > Authentication > Users > Add user
-- =====================================================
