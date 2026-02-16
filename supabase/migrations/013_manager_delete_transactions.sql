-- Allow managers to delete transactions from their own branch
-- Previously only admin/superadmin could delete transactions

DROP POLICY IF EXISTS "Only admins can delete transactions" ON transactions;
CREATE POLICY "Admins and managers can delete transactions"
ON transactions FOR DELETE
USING (
    is_app_user() AND (
        is_admin_or_superadmin()
        OR (get_user_role() = 'manager' AND oddzial = get_user_oddzial())
    )
);
