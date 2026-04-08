
CREATE TABLE public.office_report_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

ALTER TABLE public.office_report_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner/Admin can manage office_report_notes"
ON public.office_report_notes
FOR ALL
TO authenticated
USING (is_owner_or_admin(auth.uid()))
WITH CHECK (is_owner_or_admin(auth.uid()));
