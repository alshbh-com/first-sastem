
CREATE TABLE public.office_simple_diaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  diary_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- الرصيد السابق
  previous_him NUMERIC NOT NULL DEFAULT 0,         -- له
  previous_us NUMERIC NOT NULL DEFAULT 0,          -- لينا
  
  -- المرتجع والرفض
  return_count INTEGER NOT NULL DEFAULT 0,         -- عدد المرتجع
  return_value NUMERIC NOT NULL DEFAULT 0,         -- قيمة المرتجع
  reject_shipping NUMERIC NOT NULL DEFAULT 0,      -- رفض شحن
  
  -- اتجاه المستحق للعميل (him = له، us = لينا)
  customer_due_direction TEXT NOT NULL DEFAULT 'him',
  
  -- اليومية الجديدة
  new_diary_value NUMERIC NOT NULL DEFAULT 0,      -- قيمتها
  arrived NUMERIC NOT NULL DEFAULT 0,              -- الواصل
  
  -- اتجاه صافي اليومية
  net_diary_direction TEXT NOT NULL DEFAULT 'him',
  
  -- النزول
  descent_value NUMERIC NOT NULL DEFAULT 0,        -- قيمة النزول
  
  -- اتجاه الصافي بالنزول
  net_with_descent_direction TEXT NOT NULL DEFAULT 'him',
  
  notes TEXT DEFAULT '',
  
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_osd_office ON public.office_simple_diaries(office_id);
CREATE INDEX idx_osd_date ON public.office_simple_diaries(diary_date);
CREATE INDEX idx_osd_deleted ON public.office_simple_diaries(deleted_at);

ALTER TABLE public.office_simple_diaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner/Admin can read simple diaries"
ON public.office_simple_diaries FOR SELECT TO authenticated
USING (public.is_owner_or_admin(auth.uid()));

CREATE POLICY "Owner/Admin can insert simple diaries"
ON public.office_simple_diaries FOR INSERT TO authenticated
WITH CHECK (public.is_owner_or_admin(auth.uid()));

CREATE POLICY "Owner/Admin can update simple diaries"
ON public.office_simple_diaries FOR UPDATE TO authenticated
USING (public.is_owner_or_admin(auth.uid()));

CREATE POLICY "Owner can delete simple diaries"
ON public.office_simple_diaries FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE TRIGGER update_osd_updated_at
BEFORE UPDATE ON public.office_simple_diaries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
