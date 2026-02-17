-- =====================================================
-- FIX 1: Set search_path on all public functions
-- Prevents search_path hijacking (Supabase linter warning 0011)
-- Uses DO block to skip functions that don't exist
-- =====================================================

DO $$
DECLARE
    fn TEXT;
BEGIN
    FOR fn IN
        SELECT unnest(ARRAY[
            'is_app_user',
            'is_admin',
            'is_manager',
            'is_admin_or_superadmin',
            'get_user_role',
            'get_user_oddzial',
            'get_profile_full_name',
            'get_user_email_lists',
            'update_updated_at_column',
            'link_app_user_on_insert',
            'link_my_account',
            'audit_trigger_func',
            '_ensure_freedom_domain',
            'allow_email_lists_before_insert_update',
            'before_user_created_allowlist',
            'can_current_user_login',
            'protect_superadmin_delete',
            'protect_superadmin_update',
            'set_tranche_prawdopodobienstwo',
            'handle_new_user'
        ])
    LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION public.%I() SET search_path = public', fn);
            RAISE NOTICE 'Fixed search_path for: %', fn;
        EXCEPTION WHEN undefined_function THEN
            RAISE NOTICE 'Skipping (not found): %', fn;
        END;
    END LOOP;
END;
$$;

-- =====================================================
-- FIX 2: Restrict audit_log INSERT policy
-- Replace always-true policy with one limited to trigger context
-- =====================================================

DROP POLICY IF EXISTS "audit_log_insert_trigger" ON audit_log;
CREATE POLICY "audit_log_insert_trigger"
ON audit_log FOR INSERT
WITH CHECK (
    current_setting('role', true) = 'postgres'
    OR is_admin_or_superadmin()
);
