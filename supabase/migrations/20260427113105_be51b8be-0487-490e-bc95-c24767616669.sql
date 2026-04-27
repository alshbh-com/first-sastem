-- Add snapshot columns to orders to preserve office/courier names after deletion
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS office_name_snapshot text,
  ADD COLUMN IF NOT EXISTS courier_name_snapshot text;

-- Backfill snapshots from existing relations
UPDATE public.orders o
SET office_name_snapshot = of.name
FROM public.offices of
WHERE o.office_id = of.id AND o.office_name_snapshot IS NULL;

UPDATE public.orders o
SET courier_name_snapshot = p.full_name
FROM public.profiles p
WHERE o.courier_id = p.id AND o.courier_name_snapshot IS NULL;

-- Trigger to auto-populate snapshots when office_id/courier_id is set or changed
CREATE OR REPLACE FUNCTION public.snapshot_order_names()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.office_id IS NOT NULL THEN
    SELECT name INTO NEW.office_name_snapshot FROM public.offices WHERE id = NEW.office_id;
  END IF;
  IF NEW.courier_id IS NOT NULL THEN
    SELECT full_name INTO NEW.courier_name_snapshot FROM public.profiles WHERE id = NEW.courier_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_order_names ON public.orders;
CREATE TRIGGER trg_snapshot_order_names
BEFORE INSERT OR UPDATE OF office_id, courier_id ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.snapshot_order_names();

-- Add return_pieces_count column to office_simple_diaries (split return_count box)
ALTER TABLE public.office_simple_diaries
  ADD COLUMN IF NOT EXISTS return_pieces_count integer NOT NULL DEFAULT 0;

-- Branch simple diaries: independent table for branch portal (e.g., Cairo branch)
CREATE TABLE IF NOT EXISTS public.branch_simple_diaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_user_id uuid NOT NULL,
  diary_date date NOT NULL DEFAULT CURRENT_DATE,
  previous_him numeric NOT NULL DEFAULT 0,
  previous_us numeric NOT NULL DEFAULT 0,
  return_count integer NOT NULL DEFAULT 0,
  return_pieces_count integer NOT NULL DEFAULT 0,
  return_value numeric NOT NULL DEFAULT 0,
  reject_shipping numeric NOT NULL DEFAULT 0,
  new_diary_value numeric NOT NULL DEFAULT 0,
  new_diary_orders_count integer NOT NULL DEFAULT 0,
  new_diary_pieces_count integer NOT NULL DEFAULT 0,
  arrived numeric NOT NULL DEFAULT 0,
  descent_value numeric NOT NULL DEFAULT 0,
  descent_discount numeric NOT NULL DEFAULT 0,
  descent_orders_count integer NOT NULL DEFAULT 0,
  descent_pieces_count integer NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.branch_simple_diaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Branch user can manage own diaries"
ON public.branch_simple_diaries
FOR ALL
TO authenticated
USING (branch_user_id = auth.uid())
WITH CHECK (branch_user_id = auth.uid());

CREATE POLICY "Owner/Admin can read all branch diaries"
ON public.branch_simple_diaries
FOR SELECT
TO authenticated
USING (is_owner_or_admin(auth.uid()));

CREATE TRIGGER update_branch_simple_diaries_updated_at
BEFORE UPDATE ON public.branch_simple_diaries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();