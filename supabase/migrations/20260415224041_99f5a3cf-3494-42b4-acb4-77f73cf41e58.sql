
CREATE OR REPLACE FUNCTION public.auto_create_diary_for_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_diary_id uuid;
  v_order_date date;
BEGIN
  IF NEW.office_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Use 6 AM boundary: if before 6 AM, count as previous day
  v_order_date := ((NEW.created_at AT TIME ZONE 'Africa/Cairo') - interval '6 hours')::date;

  -- Find existing open, non-archived diary for this office and date
  SELECT id INTO v_diary_id
  FROM public.diaries
  WHERE office_id = NEW.office_id
    AND diary_date = v_order_date
    AND is_closed = false
    AND is_archived = false
    AND prevent_new_orders = false
  LIMIT 1;

  -- If no diary exists, create one
  IF v_diary_id IS NULL THEN
    INSERT INTO public.diaries (office_id, diary_date)
    VALUES (NEW.office_id, v_order_date)
    RETURNING id INTO v_diary_id;
  END IF;

  -- Link order to diary
  IF v_diary_id IS NOT NULL THEN
    INSERT INTO public.diary_orders (order_id, diary_id)
    VALUES (NEW.id, v_diary_id)
    ON CONFLICT (order_id, diary_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
