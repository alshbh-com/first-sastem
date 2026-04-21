ALTER TABLE public.office_simple_diaries
ADD COLUMN IF NOT EXISTS new_diary_orders_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS descent_orders_count integer NOT NULL DEFAULT 0;