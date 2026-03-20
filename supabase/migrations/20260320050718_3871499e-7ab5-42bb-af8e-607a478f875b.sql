
-- 1. Fix RLS: Allow admin (not just owner) to delete courier_bonuses
DROP POLICY IF EXISTS "Owner can delete bonuses" ON public.courier_bonuses;
CREATE POLICY "Owner/Admin can delete bonuses" ON public.courier_bonuses
  FOR DELETE TO authenticated
  USING (is_owner_or_admin(auth.uid()));

-- 2. Add return_status column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_status text DEFAULT '' ;

-- 3. Create price_lists table for general price lists
CREATE TABLE IF NOT EXISTS public.price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read price_lists" ON public.price_lists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner/Admin can insert price_lists" ON public.price_lists FOR INSERT TO authenticated WITH CHECK (is_owner_or_admin(auth.uid()));
CREATE POLICY "Owner/Admin can update price_lists" ON public.price_lists FOR UPDATE TO authenticated USING (is_owner_or_admin(auth.uid()));
CREATE POLICY "Owner can delete price_lists" ON public.price_lists FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'));

-- 4. Create price_list_items table
CREATE TABLE IF NOT EXISTS public.price_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id uuid NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  governorate text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  pickup_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read price_list_items" ON public.price_list_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner/Admin can insert price_list_items" ON public.price_list_items FOR INSERT TO authenticated WITH CHECK (is_owner_or_admin(auth.uid()));
CREATE POLICY "Owner/Admin can update price_list_items" ON public.price_list_items FOR UPDATE TO authenticated USING (is_owner_or_admin(auth.uid()));
CREATE POLICY "Owner/Admin can delete price_list_items" ON public.price_list_items FOR DELETE TO authenticated USING (is_owner_or_admin(auth.uid()));

-- 5. Add deleted_at to diaries for trash functionality
ALTER TABLE public.diaries ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
