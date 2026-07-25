
-- Add craftsman + source to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS assigned_craftsman text,
  ADD COLUMN IF NOT EXISTS order_source text DEFAULT 'website';

-- Internal admin notes on a customer (admin only, private)
CREATE TABLE IF NOT EXISTS public.customer_admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_admin_notes TO authenticated;
GRANT ALL ON public.customer_admin_notes TO service_role;
ALTER TABLE public.customer_admin_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage customer notes" ON public.customer_admin_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Messaging thread between admin/staff and a customer
CREATE TABLE IF NOT EXISTS public.customer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('admin','staff','customer')),
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_messages TO authenticated;
GRANT ALL ON public.customer_messages TO service_role;
ALTER TABLE public.customer_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer reads own thread" ON public.customer_messages
  FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Customer sends own message" ON public.customer_messages
  FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid() AND sender_id = auth.uid() AND sender_role = 'customer');
CREATE POLICY "Admin reads all threads" ON public.customer_messages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Admin sends message" ON public.customer_messages
  FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) AND sender_id = auth.uid() AND sender_role IN ('admin','staff'));
CREATE POLICY "Admin updates messages" ON public.customer_messages
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

CREATE INDEX IF NOT EXISTS idx_customer_messages_customer ON public.customer_messages(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_customer_admin_notes_customer ON public.customer_admin_notes(customer_id, created_at);
