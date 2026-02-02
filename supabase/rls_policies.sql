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
    role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'manager', 'agent')),
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

-- 4. POLITYKI DLA TABELI app_users
-- =====================================================

-- Użytkownicy mogą widzieć tylko siebie (chyba że są adminem)
CREATE POLICY "Users can view own profile"
ON app_users FOR SELECT
USING (
    auth_user_id = auth.uid()
    OR get_user_role() = 'admin'
);

-- Tylko admini mogą dodawać użytkowników
CREATE POLICY "Only admins can insert users"
ON app_users FOR INSERT
WITH CHECK (get_user_role() = 'admin');

-- Tylko admini mogą aktualizować użytkowników
CREATE POLICY "Only admins can update users"
ON app_users FOR UPDATE
USING (get_user_role() = 'admin');

-- Tylko admini mogą usuwać użytkowników
CREATE POLICY "Only admins can delete users"
ON app_users FOR DELETE
USING (get_user_role() = 'admin');

-- 5. POLITYKI DLA TABELI transactions
-- =====================================================

-- Odczyt: zalogowani użytkownicy widzą transakcje
-- Agenci widzą tylko swój oddział, admini i managerzy widzą wszystko
CREATE POLICY "Authenticated users can view transactions"
ON transactions FOR SELECT
USING (
    is_app_user() AND (
        get_user_role() IN ('admin', 'manager')
        OR oddzial = get_user_oddzial()
    )
);

-- Dodawanie: tylko admini i managerzy
CREATE POLICY "Admins and managers can insert transactions"
ON transactions FOR INSERT
WITH CHECK (
    is_app_user() AND get_user_role() IN ('admin', 'manager')
);

-- Aktualizacja: tylko admini i managerzy
CREATE POLICY "Admins and managers can update transactions"
ON transactions FOR UPDATE
USING (
    is_app_user() AND get_user_role() IN ('admin', 'manager')
);

-- Usuwanie: tylko admini
CREATE POLICY "Only admins can delete transactions"
ON transactions FOR DELETE
USING (
    is_app_user() AND get_user_role() = 'admin'
);

-- 6. POLITYKI DLA TABELI agent_performance
-- =====================================================

-- Odczyt: zalogowani użytkownicy
CREATE POLICY "Authenticated users can view performance"
ON agent_performance FOR SELECT
USING (
    is_app_user() AND (
        get_user_role() IN ('admin', 'manager')
        OR oddzial = get_user_oddzial()
    )
);

-- Dodawanie: admini i managerzy
CREATE POLICY "Admins and managers can insert performance"
ON agent_performance FOR INSERT
WITH CHECK (
    is_app_user() AND get_user_role() IN ('admin', 'manager')
);

-- Aktualizacja: admini i managerzy
CREATE POLICY "Admins and managers can update performance"
ON agent_performance FOR UPDATE
USING (
    is_app_user() AND get_user_role() IN ('admin', 'manager')
);

-- Usuwanie: tylko admini
CREATE POLICY "Only admins can delete performance"
ON agent_performance FOR DELETE
USING (
    is_app_user() AND get_user_role() = 'admin'
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
    is_app_user() AND get_user_role() = 'admin'
);

-- Aktualizacja: tylko admini
CREATE POLICY "Only admins can update targets"
ON branch_targets FOR UPDATE
USING (
    is_app_user() AND get_user_role() = 'admin'
);

-- Usuwanie: tylko admini
CREATE POLICY "Only admins can delete targets"
ON branch_targets FOR DELETE
USING (
    is_app_user() AND get_user_role() = 'admin'
);

-- 8. DODANIE PIERWSZEGO ADMINISTRATORA
-- =====================================================
-- WAŻNE: Po uruchomieniu tego skryptu, musisz:
-- 1. Najpierw utworzyć konto przez panel logowania Supabase Auth
-- 2. Następnie uruchomić poniższe polecenie z odpowiednim emailem i auth_user_id

-- Przykład dodania admina (zamień na prawdziwe dane):
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
WHERE get_user_role() = 'admin';

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
