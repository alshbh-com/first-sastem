
-- 1) Remove the duplicate "بدون حالة" status row (no-status is now represented by NULL status_id)
DELETE FROM public.order_statuses WHERE name = 'بدون حالة';

-- 2) Allow owner/admin to delete branch_simple_diaries (soft or hard delete)
CREATE POLICY "Owner/Admin can delete branch diaries"
ON public.branch_simple_diaries
FOR DELETE
TO authenticated
USING (is_owner_or_admin(auth.uid()));

CREATE POLICY "Owner/Admin can update branch diaries"
ON public.branch_simple_diaries
FOR UPDATE
TO authenticated
USING (is_owner_or_admin(auth.uid()))
WITH CHECK (is_owner_or_admin(auth.uid()));
