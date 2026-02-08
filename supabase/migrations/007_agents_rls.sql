-- Migration: RLS policies for agents table
-- Ensures proper access control for agent records
-- Run this in Supabase SQL Editor

-- 1. Enable RLS (if not already enabled)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- 2. SELECT: all app users can view agents
CREATE POLICY "App users can view agents"
ON agents FOR SELECT
USING (is_app_user());

-- 3. INSERT: only admin/superadmin/manager can add agents
CREATE POLICY "Admins and managers can insert agents"
ON agents FOR INSERT
WITH CHECK (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR get_user_role() = 'manager'
    )
);

-- 4. UPDATE: only admin/superadmin/manager can update agents
CREATE POLICY "Admins and managers can update agents"
ON agents FOR UPDATE
USING (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR get_user_role() = 'manager'
    )
);

-- 5. DELETE: only admin/superadmin can delete agents
CREATE POLICY "Admins can delete agents"
ON agents FOR DELETE
USING (
    is_app_user() AND is_admin_or_superadmin()
);
