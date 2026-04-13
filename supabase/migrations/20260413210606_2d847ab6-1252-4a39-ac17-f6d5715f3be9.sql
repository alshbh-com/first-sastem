
CREATE TABLE public.office_report_hidden_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  hidden_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

ALTER TABLE public.office_report_hidden_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner/Admin can manage office_report_hidden_orders"
ON public.office_report_hidden_orders
FOR ALL
TO authenticated
USING (is_owner_or_admin(auth.uid()))
WITH CHECK (is_owner_or_admin(auth.uid()));
