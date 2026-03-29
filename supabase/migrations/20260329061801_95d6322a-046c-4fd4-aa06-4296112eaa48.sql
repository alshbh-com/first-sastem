
-- 1. courier_leaves (إجازات المندوبين)
CREATE TABLE public.courier_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id uuid NOT NULL,
  leave_date date NOT NULL,
  reason text DEFAULT '',
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner/Admin can manage courier_leaves" ON public.courier_leaves FOR ALL TO authenticated USING (is_owner_or_admin(auth.uid())) WITH CHECK (is_owner_or_admin(auth.uid()));
CREATE POLICY "Courier can read own leaves" ON public.courier_leaves FOR SELECT TO authenticated USING (courier_id = auth.uid());
CREATE POLICY "Courier can insert own leaves" ON public.courier_leaves FOR INSERT TO authenticated WITH CHECK (courier_id = auth.uid());

-- 2. courier_ratings (تقييم المندوبين)
CREATE TABLE public.courier_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id uuid NOT NULL,
  rating integer NOT NULL DEFAULT 0,
  month integer NOT NULL,
  year integer NOT NULL,
  notes text DEFAULT '',
  rated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(courier_id, month, year)
);
ALTER TABLE public.courier_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner/Admin can manage courier_ratings" ON public.courier_ratings FOR ALL TO authenticated USING (is_owner_or_admin(auth.uid())) WITH CHECK (is_owner_or_admin(auth.uid()));
CREATE POLICY "Courier can read own ratings" ON public.courier_ratings FOR SELECT TO authenticated USING (courier_id = auth.uid());

-- 3. courier_violations (مخالفات وإنذارات)
CREATE TABLE public.courier_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id uuid NOT NULL,
  violation_type text NOT NULL DEFAULT 'warning', -- warning, violation, suspension
  reason text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner/Admin can manage courier_violations" ON public.courier_violations FOR ALL TO authenticated USING (is_owner_or_admin(auth.uid())) WITH CHECK (is_owner_or_admin(auth.uid()));
CREATE POLICY "Courier can read own violations" ON public.courier_violations FOR SELECT TO authenticated USING (courier_id = auth.uid());

-- 4. courier_rewards (مكافآت تلقائية)
CREATE TABLE public.courier_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id uuid NOT NULL,
  reward_date date NOT NULL DEFAULT CURRENT_DATE,
  deliveries_count integer NOT NULL DEFAULT 0,
  reward_amount numeric NOT NULL DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner/Admin can manage courier_rewards" ON public.courier_rewards FOR ALL TO authenticated USING (is_owner_or_admin(auth.uid())) WITH CHECK (is_owner_or_admin(auth.uid()));
CREATE POLICY "Courier can read own rewards" ON public.courier_rewards FOR SELECT TO authenticated USING (courier_id = auth.uid());

-- 5. customer_complaints (شكاوى العملاء)
CREATE TABLE public.customer_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  complaint_text text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open', -- open, in_progress, resolved, closed
  resolution text DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.customer_complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner/Admin can manage complaints" ON public.customer_complaints FOR ALL TO authenticated USING (is_owner_or_admin(auth.uid())) WITH CHECK (is_owner_or_admin(auth.uid()));

-- 6. internal_tickets (تذاكر داخلية)
CREATE TABLE public.internal_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open', -- open, in_progress, closed
  priority text NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  created_by uuid,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
ALTER TABLE public.internal_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner/Admin can manage tickets" ON public.internal_tickets FOR ALL TO authenticated USING (is_owner_or_admin(auth.uid())) WITH CHECK (is_owner_or_admin(auth.uid()));
CREATE POLICY "User can read own tickets" ON public.internal_tickets FOR SELECT TO authenticated USING (created_by = auth.uid() OR assigned_to = auth.uid());
CREATE POLICY "User can insert tickets" ON public.internal_tickets FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- 7. vehicles (مركبات المندوبين)
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id uuid NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'motorcycle', -- motorcycle, car, van
  plate_number text DEFAULT '',
  brand text DEFAULT '',
  model text DEFAULT '',
  year integer,
  next_maintenance_date date,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner/Admin can manage vehicles" ON public.vehicles FOR ALL TO authenticated USING (is_owner_or_admin(auth.uid())) WITH CHECK (is_owner_or_admin(auth.uid()));
CREATE POLICY "Courier can read own vehicles" ON public.vehicles FOR SELECT TO authenticated USING (courier_id = auth.uid());

-- 8. fuel_entries (تكلفة البنزين)
CREATE TABLE public.fuel_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  liters numeric DEFAULT 0,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fuel_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner/Admin can manage fuel_entries" ON public.fuel_entries FOR ALL TO authenticated USING (is_owner_or_admin(auth.uid())) WITH CHECK (is_owner_or_admin(auth.uid()));
CREATE POLICY "Courier can read own fuel" ON public.fuel_entries FOR SELECT TO authenticated USING (courier_id = auth.uid());

-- 9. inventory_items (جرد المخزن)
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 0,
  category text DEFAULT '',
  location text DEFAULT '',
  notes text DEFAULT '',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner/Admin can manage inventory" ON public.inventory_items FOR ALL TO authenticated USING (is_owner_or_admin(auth.uid())) WITH CHECK (is_owner_or_admin(auth.uid()));
CREATE POLICY "Authenticated can read inventory" ON public.inventory_items FOR SELECT TO authenticated USING (true);

-- 10. notifications (إشعارات داخلية)
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info', -- info, warning, success, error
  is_read boolean NOT NULL DEFAULT false,
  link text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owner/Admin can manage notifications" ON public.notifications FOR ALL TO authenticated USING (is_owner_or_admin(auth.uid())) WITH CHECK (is_owner_or_admin(auth.uid()));
