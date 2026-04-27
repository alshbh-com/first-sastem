CREATE TABLE public.courier_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  current_job TEXT NOT NULL DEFAULT '',
  coverage_areas TEXT NOT NULL DEFAULT '',
  agreed_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.courier_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner/Admin can manage courier_applications"
ON public.courier_applications
FOR ALL
TO authenticated
USING (is_owner_or_admin(auth.uid()))
WITH CHECK (is_owner_or_admin(auth.uid()));

CREATE TRIGGER update_courier_applications_updated_at
BEFORE UPDATE ON public.courier_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();