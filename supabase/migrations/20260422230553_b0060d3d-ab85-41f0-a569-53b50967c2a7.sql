ALTER TABLE public.office_simple_diaries
ADD COLUMN IF NOT EXISTS new_diary_pieces_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS descent_pieces_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS descent_discount numeric NOT NULL DEFAULT 0;