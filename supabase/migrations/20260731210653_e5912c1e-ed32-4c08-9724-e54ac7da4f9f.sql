-- 1) Single source of truth for brand / store details
CREATE TABLE public.site_settings (
  id text PRIMARY KEY DEFAULT 'default',
  brand_name text NOT NULL DEFAULT 'True Furniture''s',
  tagline text NOT NULL DEFAULT 'Fully Customizable Furniture',
  cities text NOT NULL DEFAULT 'Indore & Ujjain',
  established text NOT NULL DEFAULT '2007',
  phone text NOT NULL DEFAULT '+91 77738 96496',
  whatsapp text NOT NULL DEFAULT '917773896496',
  email text NOT NULL DEFAULT 'hello@truefurnitures.in',
  address text NOT NULL DEFAULT 'Vijay Nagar, Indore — 452010',
  meta_title text NOT NULL DEFAULT 'True Furniture''s — Fully Customizable Furniture | Indore & Ujjain',
  meta_description text NOT NULL DEFAULT 'True Furniture''s — fully customizable sofas designed in 3D. Choose fabric, colour, size and finish. Hand-tailored in Indore & Ujjain.',
  deposit_rate integer NOT NULL DEFAULT 20,
  free_delivery_above numeric NOT NULL DEFAULT 15000,
  delivery_note text NOT NULL DEFAULT 'Free delivery in Indore & MP above ₹15,000',
  announcement text,
  announcement_on boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings are public to read"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins and staff can insert site settings"
  ON public.site_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins and staff can update site settings"
  ON public.site_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TRIGGER site_settings_set_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_settings (id) VALUES ('default');

-- 2) Razorpay webhook / payment event log (idempotency + admin visibility)
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  razorpay_order_id text,
  razorpay_payment_id text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric,
  currency text,
  status text NOT NULL DEFAULT 'received',
  error text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payment_events_created_at_idx ON public.payment_events (created_at DESC);
CREATE INDEX payment_events_order_id_idx ON public.payment_events (order_id);

GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and staff can view payment events"
  ON public.payment_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE TRIGGER payment_events_set_updated_at
  BEFORE UPDATE ON public.payment_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();