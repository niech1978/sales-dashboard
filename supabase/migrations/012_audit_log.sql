-- Tabela audit_log - historia zmian w bazie danych
CREATE TABLE IF NOT EXISTS audit_log (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tabela text NOT NULL,
    akcja text NOT NULL CHECK (akcja IN ('INSERT', 'UPDATE', 'DELETE')),
    rekord_id text,
    uzytkownik_id uuid,
    uzytkownik_email text,
    stare_dane jsonb,
    nowe_dane jsonb,
    created_at timestamptz DEFAULT now()
);

-- Indeksy dla szybkiego wyszukiwania
CREATE INDEX IF NOT EXISTS idx_audit_log_tabela ON audit_log(tabela);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_rekord_id ON audit_log(rekord_id);

-- Funkcja triggerowa - uniwersalna dla wszystkich tabel
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    _user_id uuid;
    _user_email text;
    _record_id text;
BEGIN
    -- Pobierz aktualnego użytkownika z Supabase auth
    _user_id := auth.uid();
    _user_email := (SELECT email FROM auth.users WHERE id = _user_id);

    -- Ustal ID rekordu
    IF TG_OP = 'DELETE' THEN
        _record_id := OLD.id::text;
    ELSE
        _record_id := NEW.id::text;
    END IF;

    INSERT INTO audit_log (tabela, akcja, rekord_id, uzytkownik_id, uzytkownik_email, stare_dane, nowe_dane)
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        _record_id,
        _user_id,
        _user_email,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggery na głównych tabelach
DROP TRIGGER IF EXISTS audit_transactions ON transactions;
CREATE TRIGGER audit_transactions
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_agents ON agents;
CREATE TRIGGER audit_agents
    AFTER INSERT OR UPDATE OR DELETE ON agents
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_transaction_tranches ON transaction_tranches;
CREATE TRIGGER audit_transaction_tranches
    AFTER INSERT OR UPDATE OR DELETE ON transaction_tranches
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_branch_targets ON branch_targets;
CREATE TRIGGER audit_branch_targets
    AFTER INSERT OR UPDATE OR DELETE ON branch_targets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- RLS: tylko admin/superadmin mogą czytać logi
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_superadmin" ON audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM app_users
            WHERE auth_user_id = auth.uid()
            AND role = 'superadmin'
            AND is_active = true
        )
    );

-- Nikt nie może ręcznie modyfikować logów (tylko trigger)
CREATE POLICY "audit_log_insert_trigger" ON audit_log
    FOR INSERT WITH CHECK (true);
