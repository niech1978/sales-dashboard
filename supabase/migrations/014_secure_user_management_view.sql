-- Fix security warning: user_management view exposes auth.users to PostgREST
-- Recreate view with security_invoker = true so it runs with caller's permissions

CREATE OR REPLACE VIEW user_management
WITH (security_invoker = true)
AS
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

-- Revoke direct access from anon role
REVOKE ALL ON user_management FROM anon;

-- Only authenticated users (via RLS + is_admin_or_superadmin check) can use the view
GRANT SELECT ON user_management TO authenticated;
