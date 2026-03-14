
-- Drop overly permissive anon policies and replace with edge function approach
DROP POLICY IF EXISTS "Public can read order by confirmation token" ON public.orders;
DROP POLICY IF EXISTS "Anon can update confirmation status" ON public.orders;
