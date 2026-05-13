-- Daily Closing diaries (per office, per day)
CREATE TABLE IF NOT EXISTS public.daily_closing_diaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL,
  diary_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (office_id, diary_date)
);

CREATE INDEX IF NOT EXISTS idx_dcd_office_date ON public.daily_closing_diaries(office_id, diary_date DESC);

ALTER TABLE public.daily_closing_diaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read dcd" ON public.daily_closing_diaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "OA insert dcd" ON public.daily_closing_diaries FOR INSERT TO authenticated WITH CHECK (is_owner_or_admin(auth.uid()) OR has_role(auth.uid(),'moderator'::app_role));
CREATE POLICY "OA update dcd" ON public.daily_closing_diaries FOR UPDATE TO authenticated USING (is_owner_or_admin(auth.uid()) OR has_role(auth.uid(),'moderator'::app_role));
CREATE POLICY "Owner delete dcd" ON public.daily_closing_diaries FOR DELETE TO authenticated USING (has_role(auth.uid(),'owner'::app_role));

CREATE TRIGGER trg_dcd_updated BEFORE UPDATE ON public.daily_closing_diaries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Entries inside each daily closing diary
CREATE TABLE IF NOT EXISTS public.daily_closing_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES public.daily_closing_diaries(id) ON DELETE CASCADE,
  order_id UUID NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  copied_from_diary_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (diary_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_dce_diary ON public.daily_closing_entries(diary_id);
CREATE INDEX IF NOT EXISTS idx_dce_order ON public.daily_closing_entries(order_id);

ALTER TABLE public.daily_closing_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read dce" ON public.daily_closing_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "OA insert dce" ON public.daily_closing_entries FOR INSERT TO authenticated WITH CHECK (is_owner_or_admin(auth.uid()) OR has_role(auth.uid(),'moderator'::app_role));
CREATE POLICY "OA update dce" ON public.daily_closing_entries FOR UPDATE TO authenticated USING (is_owner_or_admin(auth.uid()) OR has_role(auth.uid(),'moderator'::app_role));
CREATE POLICY "OA delete dce" ON public.daily_closing_entries FOR DELETE TO authenticated USING (is_owner_or_admin(auth.uid()) OR has_role(auth.uid(),'moderator'::app_role));

-- Auto-add new orders to today's daily closing diary for their office
CREATE OR REPLACE FUNCTION public.auto_add_order_to_daily_closing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_diary_id uuid;
  v_date date;
  v_office_name text;
  v_weekday_ar text;
  v_title text;
BEGIN
  IF NEW.office_id IS NULL THEN RETURN NEW; END IF;

  v_date := ((NEW.created_at AT TIME ZONE 'Africa/Cairo'))::date;

  SELECT id INTO v_diary_id FROM public.daily_closing_diaries
   WHERE office_id = NEW.office_id AND diary_date = v_date LIMIT 1;

  IF v_diary_id IS NULL THEN
    SELECT name INTO v_office_name FROM public.offices WHERE id = NEW.office_id;
    v_weekday_ar := CASE EXTRACT(DOW FROM v_date)
      WHEN 0 THEN 'الأحد' WHEN 1 THEN 'الإثنين' WHEN 2 THEN 'الثلاثاء'
      WHEN 3 THEN 'الأربعاء' WHEN 4 THEN 'الخميس' WHEN 5 THEN 'الجمعة'
      WHEN 6 THEN 'السبت' END;
    v_title := COALESCE(v_office_name,'') || ' - ' || v_weekday_ar || ' ' || to_char(v_date,'DD/MM/YYYY');

    INSERT INTO public.daily_closing_diaries (office_id, diary_date, title)
    VALUES (NEW.office_id, v_date, v_title)
    ON CONFLICT (office_id, diary_date) DO UPDATE SET diary_date = EXCLUDED.diary_date
    RETURNING id INTO v_diary_id;
  END IF;

  IF v_diary_id IS NOT NULL THEN
    INSERT INTO public.daily_closing_entries (diary_id, order_id)
    VALUES (v_diary_id, NEW.id)
    ON CONFLICT (diary_id, order_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_add_order_dcd ON public.orders;
CREATE TRIGGER trg_auto_add_order_dcd
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.auto_add_order_to_daily_closing();