-- =====================================================
-- MIGRACJA 004: Poprawka polityk RLS dla roli Manager
-- Manager widzi tylko dane ze swojego oddziału
-- =====================================================

-- 1. USUNIĘCIE STARYCH POLITYK DLA transactions
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view transactions" ON transactions;
DROP POLICY IF EXISTS "Admins and managers can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Admins and managers can update transactions" ON transactions;

-- 2. NOWE POLITYKI DLA transactions
-- =====================================================

-- SELECT: Admin widzi wszystko, Manager/Agent widzi tylko swój oddział
CREATE POLICY "Authenticated users can view transactions"
ON transactions FOR SELECT
USING (
    is_app_user() AND (
        get_user_role() = 'admin'
        OR oddzial = get_user_oddzial()
    )
);

-- INSERT: Admin może do wszystkich, Manager tylko do swojego oddziału
CREATE POLICY "Admins and managers can insert transactions"
ON transactions FOR INSERT
WITH CHECK (
    is_app_user() AND (
        get_user_role() = 'admin'
        OR (get_user_role() = 'manager' AND oddzial = get_user_oddzial())
    )
);

-- UPDATE: Admin może wszystko, Manager tylko swój oddział
CREATE POLICY "Admins and managers can update transactions"
ON transactions FOR UPDATE
USING (
    is_app_user() AND (
        get_user_role() = 'admin'
        OR (get_user_role() = 'manager' AND oddzial = get_user_oddzial())
    )
);

-- 3. USUNIĘCIE STARYCH POLITYK DLA agent_performance
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view performance" ON agent_performance;
DROP POLICY IF EXISTS "Admins and managers can insert performance" ON agent_performance;
DROP POLICY IF EXISTS "Admins and managers can update performance" ON agent_performance;

-- 4. NOWE POLITYKI DLA agent_performance
-- =====================================================

-- SELECT: Admin widzi wszystko, Manager/Agent widzi tylko swój oddział
CREATE POLICY "Authenticated users can view performance"
ON agent_performance FOR SELECT
USING (
    is_app_user() AND (
        get_user_role() = 'admin'
        OR oddzial = get_user_oddzial()
    )
);

-- INSERT: Admin może do wszystkich, Manager tylko do swojego oddziału
CREATE POLICY "Admins and managers can insert performance"
ON agent_performance FOR INSERT
WITH CHECK (
    is_app_user() AND (
        get_user_role() = 'admin'
        OR (get_user_role() = 'manager' AND oddzial = get_user_oddzial())
    )
);

-- UPDATE: Admin może wszystko, Manager tylko swój oddział
CREATE POLICY "Admins and managers can update performance"
ON agent_performance FOR UPDATE
USING (
    is_app_user() AND (
        get_user_role() = 'admin'
        OR (get_user_role() = 'manager' AND oddzial = get_user_oddzial())
    )
);

-- =====================================================
-- 5. TRIGGER DO AUTOMATYCZNEGO POWIĄZANIA UŻYTKOWNIKA
-- =====================================================
-- Po rejestracji użytkownika, automatycznie powiąż go z wpisem w app_users

CREATE OR REPLACE FUNCTION link_auth_user_to_app_user()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE app_users
    SET auth_user_id = NEW.id
    WHERE email = NEW.email
    AND auth_user_id IS NULL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION link_auth_user_to_app_user();

-- =====================================================
-- PRZYKŁAD DODANIA MANAGERA
-- =====================================================
--
-- 1. Użytkownik musi się zarejestrować przez logowanie
-- 2. Znajdź jego UUID w Authentication > Users
-- 3. Uruchom:
--
-- INSERT INTO app_users (auth_user_id, email, name, role, oddzial, is_active)
-- VALUES (
--     'UUID-użytkownika',
--     'manager@freedom.pl',
--     'Jan Kowalski',
--     'manager',
--     'Kraków',
--     true
-- );
--
-- =====================================================
