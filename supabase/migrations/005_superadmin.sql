-- =====================================================
-- MIGRACJA 005: Rola SUPERADMIN
-- Superadmin = admin którego nie można usunąć, zdegradować ani dezaktywować
-- =====================================================

-- 1. ROZSZERZENIE CHECK CONSTRAINT dla roli
-- =====================================================
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check
    CHECK (role IN ('superadmin', 'admin', 'manager', 'agent'));

-- 2. TRIGGER: Ochrona superadmina przed usunięciem
-- =====================================================
CREATE OR REPLACE FUNCTION protect_superadmin_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role = 'superadmin' THEN
        RAISE EXCEPTION 'Nie można usunąć konta superadmina (%)' , OLD.email;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_superadmin_delete ON app_users;
CREATE TRIGGER prevent_superadmin_delete
    BEFORE DELETE ON app_users
    FOR EACH ROW
    EXECUTE FUNCTION protect_superadmin_delete();

-- 3. TRIGGER: Ochrona superadmina przed zmianą roli, dezaktywacją lub zmianą emaila
-- =====================================================
CREATE OR REPLACE FUNCTION protect_superadmin_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role = 'superadmin' THEN
        -- Nie pozwól zmienić roli superadmina
        IF NEW.role <> 'superadmin' THEN
            RAISE EXCEPTION 'Nie można zmienić roli superadmina (%)' , OLD.email;
        END IF;
        -- Nie pozwól dezaktywować superadmina
        IF NEW.is_active = false THEN
            RAISE EXCEPTION 'Nie można dezaktywować konta superadmina (%)' , OLD.email;
        END IF;
        -- Nie pozwól zmienić emaila superadmina
        IF NEW.email <> OLD.email THEN
            RAISE EXCEPTION 'Nie można zmienić adresu email superadmina (%)' , OLD.email;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_superadmin_update ON app_users;
CREATE TRIGGER prevent_superadmin_update
    BEFORE UPDATE ON app_users
    FOR EACH ROW
    EXECUTE FUNCTION protect_superadmin_update();

-- 4. AKTUALIZACJA FUNKCJI POMOCNICZYCH
-- =====================================================
-- Superadmin ma takie same uprawnienia jak admin (lub wyższe)

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM app_users
    WHERE auth_user_id = auth.uid()
    AND is_active = true;

    RETURN COALESCE(user_role, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nowa funkcja: sprawdza czy użytkownik jest adminem lub superadminem
CREATE OR REPLACE FUNCTION is_admin_or_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM app_users
        WHERE auth_user_id = auth.uid()
        AND is_active = true
        AND role IN ('admin', 'superadmin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. AKTUALIZACJA POLITYK RLS - zamiana get_user_role() = 'admin' na is_admin_or_superadmin()
-- =====================================================

-- app_users policies
DROP POLICY IF EXISTS "Users can view own profile" ON app_users;
CREATE POLICY "Users can view own profile"
ON app_users FOR SELECT
USING (
    auth_user_id = auth.uid()
    OR is_admin_or_superadmin()
);

DROP POLICY IF EXISTS "Only admins can insert users" ON app_users;
CREATE POLICY "Only admins can insert users"
ON app_users FOR INSERT
WITH CHECK (is_admin_or_superadmin());

DROP POLICY IF EXISTS "Only admins can update users" ON app_users;
CREATE POLICY "Only admins can update users"
ON app_users FOR UPDATE
USING (is_admin_or_superadmin());

DROP POLICY IF EXISTS "Only admins can delete users" ON app_users;
CREATE POLICY "Only admins can delete users"
ON app_users FOR DELETE
USING (is_admin_or_superadmin());

-- transactions policies
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

-- agent_performance policies
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

-- branch_targets policies
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

-- 6. AKTUALIZACJA WIDOKU user_management
-- =====================================================
CREATE OR REPLACE VIEW user_management AS
SELECT
    au.id,
    au.email,
    au.name,
    au.role,
    au.oddzial,
    au.is_active,
    au.created_at,
    u.last_sign_in_at
FROM app_users au
LEFT JOIN auth.users u ON au.auth_user_id = u.id
WHERE is_admin_or_superadmin();

-- 7. DODANIE SUPERADMINA j.niechwiadowicz@freedom.pl
-- =====================================================
-- Jeśli użytkownik już istnieje w app_users - zmień rolę na superadmin
-- Jeśli nie istnieje - dodaj nowy wpis

INSERT INTO app_users (email, name, role, is_active)
VALUES ('j.niechwiadowicz@freedom.pl', 'Jarek Niechwiadowicz', 'superadmin', true)
ON CONFLICT (email) DO UPDATE SET
    role = 'superadmin',
    is_active = true;

-- =====================================================
-- KONIEC MIGRACJI 005
-- =====================================================
-- Po uruchomieniu tego skryptu w SQL Editor:
-- 1. Superadmin j.niechwiadowicz@freedom.pl jest chroniony triggerami
-- 2. Nikt nie może go usunąć, zdegradować ani dezaktywować
-- 3. Superadmin ma pełne uprawnienia admina we wszystkich politykach RLS
-- =====================================================
