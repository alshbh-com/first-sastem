
-- Add approval columns to orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS is_pending_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS branch_label text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approved_by uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz DEFAULT NULL;

-- Allow branch users to insert orders (pending approval)
CREATE POLICY "Branch can insert pending orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'branch'::app_role) 
  AND is_pending_approval = true
);

-- Allow branch users to read their own orders
CREATE POLICY "Branch can read own orders"
ON public.orders FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'branch'::app_role) 
  AND created_by = auth.uid()
);
