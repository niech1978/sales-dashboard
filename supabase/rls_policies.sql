-- =====================================================
-- RLS (Row Level Security) Policies dla Sales Dashboard
-- Uruchom ten skrypt w SQL Editor w panelu Supabase
-- =====================================================

-- 1. WŁĄCZENIE RLS NA WSZYSTKICH TABELACH
-- =====================================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_targets ENABLE ROW LEVEL SECURITY;

-- 2. TABELA UŻYTKOWNIKÓW SYSTEMU
-- =====================================================
-- Tworzymy tabelę z użytkownikami którzy mają dostęp do systemu

CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('superadmin', 'admin', 'manager', 'agent')),
    oddzial TEXT CHECK (oddzial IN ('Kraków', 'Warszawa', 'Olsztyn')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Włącz RLS dla app_users
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- 3. FUNKCJA POMOCNICZA - sprawdza czy użytkownik jest w systemie
-- =====================================================

CREATE OR REPLACE FUNCTION is_app_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM app_users
        WHERE auth_user_id = auth.uid()
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja pobierająca rolę użytkownika
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

-- Funkcja pobierająca oddział użytkownika
CREATE OR REPLACE FUNCTION get_user_oddzial()
RETURNS TEXT AS $$
DECLARE
    user_oddzial TEXT;
BEGIN
    SELECT oddzial INTO user_oddzial
    FROM app_users
    WHERE auth_user_id = auth.uid()
    AND is_active = true;

    RETURN user_oddzial;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNKCJA POMOCNICZA - sprawdza czy admin lub superadmin
-- =====================================================

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

-- 5. OCHRONA SUPERADMINA - triggery zapobiegające usunięciu/degradacji
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

CREATE OR REPLACE FUNCTION protect_superadmin_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role = 'superadmin' THEN
        IF NEW.role <> 'superadmin' THEN
            RAISE EXCEPTION 'Nie można zmienić roli superadmina (%)' , OLD.email;
        END IF;
        IF NEW.is_active = false THEN
            RAISE EXCEPTION 'Nie można dezaktywować konta superadmina (%)' , OLD.email;
        END IF;
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

-- 6. POLITYKI DLA TABELI app_users
-- =====================================================

-- Użytkownicy mogą widzieć tylko siebie (chyba że są adminem/superadminem)
CREATE POLICY "Users can view own profile"
ON app_users FOR SELECT
USING (
    auth_user_id = auth.uid()
    OR is_admin_or_superadmin()
);

-- Tylko admini/superadmini mogą dodawać użytkowników
CREATE POLICY "Only admins can insert users"
ON app_users FOR INSERT
WITH CHECK (is_admin_or_superadmin());

-- Tylko admini/superadmini mogą aktualizować użytkowników
CREATE POLICY "Only admins can update users"
ON app_users FOR UPDATE
USING (is_admin_or_superadmin());

-- Tylko admini/superadmini mogą usuwać użytkowników
CREATE POLICY "Only admins can delete users"
ON app_users FOR DELETE
USING (is_admin_or_superadmin());

-- 5. POLITYKI DLA TABELI transactions
-- =====================================================

-- Odczyt:
-- - Admin widzi wszystkie oddziały
-- - Manager widzi tylko swój oddział
-- - Agent widzi tylko swój oddział
CREATE POLICY "Authenticated users can view transactions"
ON transactions FOR SELECT
USING (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR oddzial = get_user_oddzial()
    )
);

-- Dodawanie:
-- - Admin może dodawać do wszystkich oddziałów
-- - Manager może dodawać tylko do swojego oddziału
CREATE POLICY "Admins and managers can insert transactions"
ON transactions FOR INSERT
WITH CHECK (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR (get_user_role() = 'manager' AND oddzial = get_user_oddzial())
    )
);

-- Aktualizacja:
-- - Admin może edytować wszystko
-- - Manager może edytować tylko swój oddział
CREATE POLICY "Admins and managers can update transactions"
ON transactions FOR UPDATE
USING (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR (get_user_role() = 'manager' AND oddzial = get_user_oddzial())
    )
);

-- Usuwanie: tylko admini
CREATE POLICY "Only admins can delete transactions"
ON transactions FOR DELETE
USING (
    is_app_user() AND is_admin_or_superadmin()
);

-- 6. POLITYKI DLA TABELI agent_performance
-- =====================================================

-- Odczyt:
-- - Admin widzi wszystkie oddziały
-- - Manager/Agent widzi tylko swój oddział
CREATE POLICY "Authenticated users can view performance"
ON agent_performance FOR SELECT
USING (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR oddzial = get_user_oddzial()
    )
);

-- Dodawanie:
-- - Admin może dodawać do wszystkich oddziałów
-- - Manager może dodawać tylko do swojego oddziału
CREATE POLICY "Admins and managers can insert performance"
ON agent_performance FOR INSERT
WITH CHECK (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR (get_user_role() = 'manager' AND oddzial = get_user_oddzial())
    )
);

-- Aktualizacja:
-- - Admin może edytować wszystko
-- - Manager może edytować tylko swój oddział
CREATE POLICY "Admins and managers can update performance"
ON agent_performance FOR UPDATE
USING (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR (get_user_role() = 'manager' AND oddzial = get_user_oddzial())
    )
);

-- Usuwanie: tylko admini
CREATE POLICY "Only admins can delete performance"
ON agent_performance FOR DELETE
USING (
    is_app_user() AND is_admin_or_superadmin()
);

-- 7. POLITYKI DLA TABELI branch_targets
-- =====================================================

-- Odczyt: wszyscy zalogowani użytkownicy
CREATE POLICY "Authenticated users can view targets"
ON branch_targets FOR SELECT
USING (is_app_user());

-- Dodawanie: tylko admini
CREATE POLICY "Only admins can insert targets"
ON branch_targets FOR INSERT
WITH CHECK (
    is_app_user() AND is_admin_or_superadmin()
);

-- Aktualizacja: tylko admini
CREATE POLICY "Only admins can update targets"
ON branch_targets FOR UPDATE
USING (
    is_app_user() AND is_admin_or_superadmin()
);

-- Usuwanie: tylko admini
CREATE POLICY "Only admins can delete targets"
ON branch_targets FOR DELETE
USING (
    is_app_user() AND is_admin_or_superadmin()
);

-- 8. DODANIE SUPERADMINA
-- =====================================================
-- Superadmin jest chroniony triggerami - nie można go usunąć, zdegradować ani dezaktywować

-- Główny superadmin:
-- INSERT INTO app_users (email, name, role, is_active)
-- VALUES ('j.niechwiadowicz@freedom.pl', 'Jarek Niechwiadowicz', 'superadmin', true)
-- ON CONFLICT (email) DO UPDATE SET role = 'superadmin', is_active = true;

-- Przykład dodania zwykłego admina (zamień na prawdziwe dane):
-- INSERT INTO app_users (auth_user_id, email, name, role, is_active)
-- VALUES (
--     'UUID-z-auth.users',  -- ID z tabeli auth.users
--     'admin@freedom.pl',
--     'Administrator',
--     'admin',
--     true
-- );

-- 9. WIDOK DO ZARZĄDZANIA UŻYTKOWNIKAMI (dla admina)
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

-- 10. TRIGGER DO AUTOMATYCZNEJ AKTUALIZACJI updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_users_updated_at
    BEFORE UPDATE ON app_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. TRIGGER DO AUTOMATYCZNEGO POWIĄZANIA UŻYTKOWNIKA
-- =====================================================
-- Po rejestracji użytkownika, automatycznie powiąż go z wpisem w app_users
-- na podstawie adresu email

CREATE OR REPLACE FUNCTION link_auth_user_to_app_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Zaktualizuj app_users gdzie email pasuje i brak auth_user_id
    UPDATE app_users
    SET auth_user_id = NEW.id
    WHERE email = NEW.email
    AND auth_user_id IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger uruchamiany po utworzeniu nowego użytkownika w auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION link_auth_user_to_app_user();

-- =====================================================
-- KONIEC SKRYPTU
-- =====================================================
--
-- PO URUCHOMIENIU TEGO SKRYPTU:
--
-- 1. Utwórz konto admina przez Authentication > Users w Supabase
-- 2. Skopiuj UUID tego użytkownika
-- 3. Uruchom:
--    INSERT INTO app_users (auth_user_id, email, name, role, is_active)
--    VALUES ('skopiowany-uuid', 'email@admina.pl', 'Imię Admina', 'admin', true);
--
-- 4. Następnie możesz dodawać kolejnych użytkowników przez aplikację
--    lub bezpośrednio przez SQL
-- =====================================================
