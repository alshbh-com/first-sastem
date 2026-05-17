CREATE TABLE public.scan_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  orders_count INTEGER NOT NULL DEFAULT 0,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE public.scan_session_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.scan_sessions(id) ON DELETE CASCADE,
  order_id UUID NOT NULL,
  scanned_code TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scan_session_items_session ON public.scan_session_items(session_id);
CREATE INDEX idx_scan_sessions_user ON public.scan_sessions(user_id);

ALTER TABLE public.scan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_session_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own sessions" ON public.scan_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_owner_or_admin(auth.uid()));
CREATE POLICY "User inserts own sessions" ON public.scan_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "User updates own sessions" ON public.scan_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_owner_or_admin(auth.uid()));
CREATE POLICY "Owner deletes sessions" ON public.scan_sessions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Read session items" ON public.scan_session_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.scan_sessions s WHERE s.id = session_id AND (s.user_id = auth.uid() OR public.is_owner_or_admin(auth.uid()))));
CREATE POLICY "Insert session items" ON public.scan_session_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.scan_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Delete session items" ON public.scan_session_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role));