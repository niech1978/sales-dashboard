-- Diagnostyka RLS: sprawdza stan zabezpieczeń wszystkich tabel
-- Uruchom w Supabase SQL Editor

-- 1. Które tabele mają RLS włączony/wyłączony?
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Jakie polityki RLS istnieją?
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual IS NOT NULL AS has_using,
    with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Tabele BEZ żadnych polityk (potencjalnie niebezpieczne jeśli RLS włączony)
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
AND p.policyname IS NULL
GROUP BY t.tablename;
