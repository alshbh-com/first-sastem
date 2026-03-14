
-- Add confirmation columns to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS confirmation_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS confirmation_token uuid DEFAULT gen_random_uuid();

-- Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  phone text NOT NULL,
  message_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for whatsapp_messages
CREATE POLICY "Owner/Admin can read messages" ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (is_owner_or_admin(auth.uid()));

CREATE POLICY "Owner/Admin can insert messages" ON public.whatsapp_messages
  FOR INSERT TO authenticated
  WITH CHECK (is_owner_or_admin(auth.uid()));

CREATE POLICY "Owner/Admin can update messages" ON public.whatsapp_messages
  FOR UPDATE TO authenticated
  USING (is_owner_or_admin(auth.uid()));

-- Allow public read of orders by confirmation_token (for confirmation pages)
CREATE POLICY "Public can read order by confirmation token" ON public.orders
  FOR SELECT TO anon
  USING (confirmation_token IS NOT NULL);

-- Allow anon to update confirmation_status via token
CREATE POLICY "Anon can update confirmation status" ON public.orders
  FOR UPDATE TO anon
  USING (confirmation_token IS NOT NULL)
  WITH CHECK (confirmation_token IS NOT NULL);
