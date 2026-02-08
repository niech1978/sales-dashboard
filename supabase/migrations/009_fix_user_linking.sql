-- =====================================================
-- MIGRACJA 009: Naprawa systemu laczenia uzytkownikow
-- =====================================================
-- Problem: trigger link_auth_user_to_app_user odpala sie
-- tylko przy INSERT do auth.users, ale NIE przy INSERT
-- do app_users. Jesli admin doda usera do app_users
-- PO tym jak user juz ma konto auth, konta nie zostana polaczone.
-- =====================================================

-- 1. NOWY TRIGGER: przy INSERT do app_users, sprobuj polaczyc z auth.users
-- =====================================================
CREATE OR REPLACE FUNCTION link_app_user_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    found_auth_id UUID;
BEGIN
    IF NEW.auth_user_id IS NULL THEN
        SELECT id INTO found_auth_id
        FROM auth.users
        WHERE email = NEW.email
        LIMIT 1;

        IF found_auth_id IS NOT NULL THEN
            NEW.auth_user_id := found_auth_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_link_app_user ON app_users;
CREATE TRIGGER auto_link_app_user
    BEFORE INSERT ON app_users
    FOR EACH ROW
    EXECUTE FUNCTION link_app_user_on_insert();

-- 2. NOWA FUNKCJA: reczne laczenie konta (wywolywane z frontendu)
-- Uzytkownik loguje sie, frontend wywoluje ta funkcje
-- zeby polaczyc app_users z auth.users po emailu
-- =====================================================
CREATE OR REPLACE FUNCTION link_my_account()
RETURNS JSONB AS $$
DECLARE
    my_email TEXT;
    my_auth_id UUID;
    updated_role TEXT;
    updated_oddzial TEXT;
BEGIN
    my_auth_id := auth.uid();
    IF my_auth_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Niezalogowany');
    END IF;

    -- Pobierz email z auth.users
    SELECT email INTO my_email FROM auth.users WHERE id = my_auth_id;

    -- Sprawdz czy juz jest polaczony
    IF EXISTS (SELECT 1 FROM app_users WHERE auth_user_id = my_auth_id AND is_active = true) THEN
        SELECT role, oddzial INTO updated_role, updated_oddzial
        FROM app_users WHERE auth_user_id = my_auth_id AND is_active = true;
        RETURN jsonb_build_object('success', true, 'already_linked', true, 'role', updated_role, 'oddzial', updated_oddzial);
    END IF;

    -- Sprobuj polaczyc po emailu
    UPDATE app_users
    SET auth_user_id = my_auth_id
    WHERE email = my_email
    AND auth_user_id IS NULL
    AND is_active = true;

    IF FOUND THEN
        SELECT role, oddzial INTO updated_role, updated_oddzial
        FROM app_users WHERE auth_user_id = my_auth_id AND is_active = true;
        RETURN jsonb_build_object('success', true, 'linked', true, 'role', updated_role, 'oddzial', updated_oddzial);
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'Brak wpisu w app_users dla tego emaila');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. JEDNORAZOWA NAPRAWA: polacz wszystkie istniejace konta
-- =====================================================
UPDATE app_users au
SET auth_user_id = u.id
FROM auth.users u
WHERE au.email = u.email
AND au.auth_user_id IS NULL;

-- =====================================================
-- Po uruchomieniu sprawdz:
-- SELECT email, auth_user_id IS NOT NULL AS linked, role
-- FROM app_users ORDER BY email;
-- =====================================================
