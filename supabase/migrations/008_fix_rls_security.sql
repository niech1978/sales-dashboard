-- =====================================================
-- MIGRACJA 008: Naprawa RLS — usuniecie starych polityk
-- i wlaczenie RLS na tabelach gdzie jest wylaczony
-- =====================================================
-- PROBLEM: Stare polityki (z wczesnych migracji i dashboard Supabase)
-- wspólistnieją z nowymi restrykcyjnymi politykami.
-- Poniewaz domyslnie polityki sa PERMISSIVE (OR), wystarczy JEDNA
-- otwarta polityka zeby obejsc wszystkie restrykcyjne.
-- =====================================================

-- =====================================================
-- 1. AGENT_PERFORMANCE — RLS wylaczony + stare polityki
-- =====================================================

-- Usun WSZYSTKIE stare/otwarte polityki
DROP POLICY IF EXISTS "agent_performance_full_access" ON agent_performance;
DROP POLICY IF EXISTS "agent_performance_anon_select" ON agent_performance;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON agent_performance;
DROP POLICY IF EXISTS "Allow read for anon" ON agent_performance;
DROP POLICY IF EXISTS "Allow read for authenticated" ON agent_performance;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON agent_performance;
DROP POLICY IF EXISTS "Allow update for authenticated" ON agent_performance;
DROP POLICY IF EXISTS "Allow delete for authenticated" ON agent_performance;

-- Wlacz RLS (mogl byc wylaczony przez dashboard)
ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;

-- Upewnij sie ze poprawne polityki istnieja (z migracji 005)
DROP POLICY IF EXISTS "Authenticated users can view performance" ON agent_performance;
CREATE POLICY "Authenticated users can view performance"
ON agent_performance FOR SELECT
USING (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR oddzial = get_user_oddzial()
    )
);

DROP POLICY IF EXISTS "Admins and managers can insert performance" ON agent_performance;
CREATE POLICY "Admins and managers can insert performance"
ON agent_performance FOR INSERT
WITH CHECK (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR (get_user_role() = 'manager' AND oddzial = get_user_oddzial())
    )
);

DROP POLICY IF EXISTS "Admins and managers can update performance" ON agent_performance;
CREATE POLICY "Admins and managers can update performance"
ON agent_performance FOR UPDATE
USING (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR (get_user_role() = 'manager' AND oddzial = get_user_oddzial())
    )
);

DROP POLICY IF EXISTS "Only admins can delete performance" ON agent_performance;
CREATE POLICY "Only admins can delete performance"
ON agent_performance FOR DELETE
USING (
    is_app_user() AND is_admin_or_superadmin()
);

-- =====================================================
-- 2. BRANCH_TARGETS — RLS wylaczony + stare polityki
-- =====================================================

-- Usun WSZYSTKIE stare/otwarte polityki
DROP POLICY IF EXISTS "branch_targets_full_access" ON branch_targets;
DROP POLICY IF EXISTS "branch_targets_anon_select" ON branch_targets;
DROP POLICY IF EXISTS "branch_targets_read_only" ON branch_targets;
DROP POLICY IF EXISTS "branch_targets_insert_authenticated_allow" ON branch_targets;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON branch_targets;
DROP POLICY IF EXISTS "Allow read for anon" ON branch_targets;
DROP POLICY IF EXISTS "Allow read for authenticated" ON branch_targets;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON branch_targets;
DROP POLICY IF EXISTS "Allow update for authenticated" ON branch_targets;
DROP POLICY IF EXISTS "Allow delete for authenticated" ON branch_targets;

-- Wlacz RLS
ALTER TABLE branch_targets ENABLE ROW LEVEL SECURITY;

-- Polityki (z migracji 005)
DROP POLICY IF EXISTS "Authenticated users can view targets" ON branch_targets;
CREATE POLICY "Authenticated users can view targets"
ON branch_targets FOR SELECT
USING (is_app_user());

DROP POLICY IF EXISTS "Only admins can insert targets" ON branch_targets;
CREATE POLICY "Only admins can insert targets"
ON branch_targets FOR INSERT
WITH CHECK (
    is_app_user() AND is_admin_or_superadmin()
);

DROP POLICY IF EXISTS "Only admins can update targets" ON branch_targets;
CREATE POLICY "Only admins can update targets"
ON branch_targets FOR UPDATE
USING (
    is_app_user() AND is_admin_or_superadmin()
);

DROP POLICY IF EXISTS "Only admins can delete targets" ON branch_targets;
CREATE POLICY "Only admins can delete targets"
ON branch_targets FOR DELETE
USING (
    is_app_user() AND is_admin_or_superadmin()
);

-- =====================================================
-- 3. TRANSACTIONS — usun stare nadmiarowe polityki
-- =====================================================

-- Stare polityki z roznych zrodel
DROP POLICY IF EXISTS "transactions_admin_all" ON transactions;
DROP POLICY IF EXISTS "transactions_agent_owns" ON transactions;
DROP POLICY IF EXISTS "transactions_agent_owns_by_id" ON transactions;
DROP POLICY IF EXISTS "transactions_only_allowed" ON transactions;
DROP POLICY IF EXISTS "Allow read for authenticated" ON transactions;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON transactions;
DROP POLICY IF EXISTS "Allow update for authenticated" ON transactions;
DROP POLICY IF EXISTS "Allow delete for authenticated" ON transactions;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON transactions;

-- RLS powinien byc juz wlaczony, ale na wszelki wypadek
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Upewnij sie ze poprawne polityki istnieja (z migracji 005)
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON transactions;
CREATE POLICY "Authenticated users can view transactions"
ON transactions FOR SELECT
USING (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR oddzial = get_user_oddzial()
    )
);

DROP POLICY IF EXISTS "Admins and managers can insert transactions" ON transactions;
CREATE POLICY "Admins and managers can insert transactions"
ON transactions FOR INSERT
WITH CHECK (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR (get_user_role() = 'manager' AND oddzial = get_user_oddzial())
    )
);

DROP POLICY IF EXISTS "Admins and managers can update transactions" ON transactions;
CREATE POLICY "Admins and managers can update transactions"
ON transactions FOR UPDATE
USING (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR (get_user_role() = 'manager' AND oddzial = get_user_oddzial())
    )
);

DROP POLICY IF EXISTS "Only admins can delete transactions" ON transactions;
CREATE POLICY "Only admins can delete transactions"
ON transactions FOR DELETE
USING (
    is_app_user() AND is_admin_or_superadmin()
);

-- =====================================================
-- 4. AGENTS — usun stare polityki
-- =====================================================

DROP POLICY IF EXISTS "agents_admin_all" ON agents;
DROP POLICY IF EXISTS "agents_manager_read" ON agents;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON agents;
DROP POLICY IF EXISTS "Allow read for anon" ON agents;

-- RLS powinien byc wlaczony (migracja 007)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Polityki z migracji 007 — odtworz na czysto
DROP POLICY IF EXISTS "App users can view agents" ON agents;
CREATE POLICY "App users can view agents"
ON agents FOR SELECT
USING (is_app_user());

DROP POLICY IF EXISTS "Admins and managers can insert agents" ON agents;
CREATE POLICY "Admins and managers can insert agents"
ON agents FOR INSERT
WITH CHECK (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR get_user_role() = 'manager'
    )
);

DROP POLICY IF EXISTS "Admins and managers can update agents" ON agents;
CREATE POLICY "Admins and managers can update agents"
ON agents FOR UPDATE
USING (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR get_user_role() = 'manager'
    )
);

DROP POLICY IF EXISTS "Admins can delete agents" ON agents;
CREATE POLICY "Admins can delete agents"
ON agents FOR DELETE
USING (
    is_app_user() AND is_admin_or_superadmin()
);

-- =====================================================
-- 5. PROFILES — usun nakladajace sie polityki
-- =====================================================

-- Usun wszystkie stare polityki profiles (nakladajace sie ALL)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- Wlacz RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Nowe czyste polityki dla profiles
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (
    auth.uid() = id
    OR is_admin_or_superadmin()
);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (
    auth.uid() = id
    OR is_admin_or_superadmin()
);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (
    auth.uid() = id
    OR is_admin_or_superadmin()
);

-- =====================================================
-- 6. ALLOW_EMAIL_LISTS — brak RLS i brak polityk
-- =====================================================

-- Wlacz RLS
ALTER TABLE IF EXISTS allow_email_lists ENABLE ROW LEVEL SECURITY;

-- Tylko admin/superadmin moze zarzadzac lista dozwolonych emaili
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'allow_email_lists') THEN
        EXECUTE 'CREATE POLICY "Admins can view allowed emails" ON allow_email_lists FOR SELECT USING (is_admin_or_superadmin())';
        EXECUTE 'CREATE POLICY "Admins can insert allowed emails" ON allow_email_lists FOR INSERT WITH CHECK (is_admin_or_superadmin())';
        EXECUTE 'CREATE POLICY "Admins can update allowed emails" ON allow_email_lists FOR UPDATE USING (is_admin_or_superadmin())';
        EXECUTE 'CREATE POLICY "Admins can delete allowed emails" ON allow_email_lists FOR DELETE USING (is_admin_or_superadmin())';
    END IF;
END $$;

-- Rowniez obsluz tabele allowed_emails jesli istnieje
ALTER TABLE IF EXISTS allowed_emails ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'allowed_emails') THEN
        -- Usun stare polityki
        EXECUTE 'DROP POLICY IF EXISTS "Allow read for authenticated" ON allowed_emails';
        EXECUTE 'DROP POLICY IF EXISTS "Allow all for authenticated users" ON allowed_emails';
        -- Nowe restrykcyjne
        EXECUTE 'CREATE POLICY "Admins can manage allowed_emails" ON allowed_emails FOR ALL USING (is_admin_or_superadmin()) WITH CHECK (is_admin_or_superadmin())';
    END IF;
END $$;

-- =====================================================
-- 7. APP_USERS — upewnij sie ze polityki sa poprawne
-- =====================================================

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Polityki z migracji 005 powinny byc ok, ale usun potencjalne stare
DROP POLICY IF EXISTS "app_users_full_access" ON app_users;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON app_users;

-- =====================================================
-- 8. TRANSACTION_TRANCHES — sprawdz RLS
-- =====================================================

ALTER TABLE transaction_tranches ENABLE ROW LEVEL SECURITY;

-- Polityki z migracji 006 powinny byc poprawne (nie bylo starych)

-- =====================================================
-- 9. WERYFIKACJA — uruchom po migracji
-- =====================================================
-- Ponizsze zapytanie pokaze status RLS na wszystkich tabelach:
--
-- SELECT schemaname, tablename, rowsecurity AS rls_enabled
-- FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
--
-- Wszystkie tabele powinny miec rls_enabled = true
--
-- Nastepnie sprawdz polityki:
--
-- SELECT tablename, policyname, permissive, roles, cmd
-- FROM pg_policies WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
--
-- Nie powinno byc zadnych polityk z USING(true) ani
-- polityk dla roli 'anon'
-- =====================================================
