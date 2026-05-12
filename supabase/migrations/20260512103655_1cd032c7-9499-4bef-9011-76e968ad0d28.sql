
-- Add moderator to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';

-- Status change notes (independent from other notes)
CREATE TABLE IF NOT EXISTS public.status_change_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE,
  note TEXT NOT NULL DEFAULT '',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.status_change_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner/Admin can read status_change_notes"
ON public.status_change_notes FOR SELECT TO authenticated
USING (public.is_owner_or_admin(auth.uid()));

CREATE POLICY "Owner/Admin can insert status_change_notes"
ON public.status_change_notes FOR INSERT TO authenticated
WITH CHECK (public.is_owner_or_admin(auth.uid()));

CREATE POLICY "Owner/Admin can update status_change_notes"
ON public.status_change_notes FOR UPDATE TO authenticated
USING (public.is_owner_or_admin(auth.uid()));

CREATE POLICY "Owner can delete status_change_notes"
ON public.status_change_notes FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE TRIGGER update_status_change_notes_updated_at
BEFORE UPDATE ON public.status_change_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
