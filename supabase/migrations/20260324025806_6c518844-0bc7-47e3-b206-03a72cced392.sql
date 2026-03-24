CREATE POLICY "Branch can delete own orders"
ON public.orders
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'branch'::app_role) AND created_by = auth.uid());