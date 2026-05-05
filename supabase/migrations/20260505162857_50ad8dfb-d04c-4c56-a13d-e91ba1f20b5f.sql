
-- Tasks table (per-user todo list)
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  is_done BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own tasks" ON public.tasks FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_tasks_updated_at BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Order schedules (postponed orders pickup time per user)
CREATE TABLE public.order_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID NOT NULL,
  scheduled_date DATE,
  time_from TEXT DEFAULT '',
  time_to TEXT DEFAULT '',
  any_time BOOLEAN NOT NULL DEFAULT false,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, order_id)
);
ALTER TABLE public.order_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own order schedules" ON public.order_schedules FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER set_order_schedules_updated_at BEFORE UPDATE ON public.order_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cron cleanup: delete closed orders older than 65 days
CREATE OR REPLACE FUNCTION public.cleanup_old_closed_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.diary_orders WHERE order_id IN (
    SELECT id FROM public.orders WHERE is_closed = true AND updated_at < now() - interval '65 days'
  );
  DELETE FROM public.orders WHERE is_closed = true AND updated_at < now() - interval '65 days';
END;
$$;
