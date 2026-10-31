UPDATE public.order_statuses SET name = 'رفض ورفض' WHERE name = 'رفض ولم يدفع شحن';
UPDATE public.order_statuses SET name = 'مغلق / لم يرد' WHERE name = 'لم يرد';

CREATE POLICY "Moderator can insert pending orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'moderator') AND is_pending_approval = true);
CREATE POLICY "Moderator can read pending orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'moderator') AND is_pending_approval = true);

INSERT INTO public.app_settings (key, value, updated_at) VALUES ('reject_reject_auto_delete_days', '30', now()) ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.cleanup_reject_reject_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer;
  v_status_id uuid;
  v_cutoff timestamptz;
  v_deleted integer := 0;
BEGIN
  v_days := (SELECT NULLIF(value, '')::integer FROM public.app_settings WHERE key = 'reject_reject_auto_delete_days' LIMIT 1);
  IF v_days IS NULL OR v_days < 1 THEN v_days := 30; END IF;
  SELECT id INTO v_status_id FROM public.order_statuses WHERE name = 'رفض ورفض' LIMIT 1;
  IF v_status_id IS NULL THEN RETURN 0; END IF;
  v_cutoff := now() - make_interval(days => v_days);

  DELETE FROM public.courier_collections WHERE order_id IN (SELECT id FROM public.orders WHERE status_id = v_status_id AND created_at < v_cutoff);
  DELETE FROM public.order_notes WHERE order_id IN (SELECT id FROM public.orders WHERE status_id = v_status_id AND created_at < v_cutoff);
  DELETE FROM public.diary_orders WHERE order_id IN (SELECT id FROM public.orders WHERE status_id = v_status_id AND created_at < v_cutoff);
  DELETE FROM public.whatsapp_messages WHERE order_id IN (SELECT id FROM public.orders WHERE status_id = v_status_id AND created_at < v_cutoff);
  DELETE FROM public.status_change_notes WHERE order_id IN (SELECT id FROM public.orders WHERE status_id = v_status_id AND created_at < v_cutoff);
  DELETE FROM public.order_schedules WHERE order_id IN (SELECT id FROM public.orders WHERE status_id = v_status_id AND created_at < v_cutoff);
  DELETE FROM public.office_report_notes WHERE order_id IN (SELECT id FROM public.orders WHERE status_id = v_status_id AND created_at < v_cutoff);
  DELETE FROM public.office_report_hidden_orders WHERE order_id IN (SELECT id FROM public.orders WHERE status_id = v_status_id AND created_at < v_cutoff);
  DELETE FROM public.daily_closing_entries WHERE order_id IN (SELECT id FROM public.orders WHERE status_id = v_status_id AND created_at < v_cutoff);
  DELETE FROM public.scan_session_items WHERE order_id IN (SELECT id FROM public.orders WHERE status_id = v_status_id AND created_at < v_cutoff);
  DELETE FROM public.orders WHERE status_id = v_status_id AND created_at < v_cutoff;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_reject_reject_order(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_owner_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'غير مصرح لك بحذف هذه الأوردرات';
  END IF;
  DELETE FROM public.courier_collections WHERE order_id = p_order_id;
  DELETE FROM public.order_notes WHERE order_id = p_order_id;
  DELETE FROM public.diary_orders WHERE order_id = p_order_id;
  DELETE FROM public.whatsapp_messages WHERE order_id = p_order_id;
  DELETE FROM public.status_change_notes WHERE order_id = p_order_id;
  DELETE FROM public.order_schedules WHERE order_id = p_order_id;
  DELETE FROM public.office_report_notes WHERE order_id = p_order_id;
  DELETE FROM public.office_report_hidden_orders WHERE order_id = p_order_id;
  DELETE FROM public.daily_closing_entries WHERE order_id = p_order_id;
  DELETE FROM public.scan_session_items WHERE order_id = p_order_id;
  DELETE FROM public.orders WHERE id = p_order_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_reject_reject_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_reject_reject_order(uuid) TO authenticated;