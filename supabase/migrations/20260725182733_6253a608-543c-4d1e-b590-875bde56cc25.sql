
-- Admin visibility for orders, profiles, order history, bookings
CREATE POLICY "Admins read all orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins read all order history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins read user_roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage user_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Coupons
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','flat')),
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  min_order_amount numeric(10,2) NOT NULL DEFAULT 0,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT ALL ON public.coupons TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active coupons" ON public.coupons FOR SELECT USING (active = true);
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_coupons_updated BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add discount_code to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_code text;

-- Saved designs
CREATE TABLE public.saved_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sofa_id uuid REFERENCES public.sofas(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT 'My Design',
  config jsonb NOT NULL DEFAULT '{}',
  share_token text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.saved_designs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.saved_designs TO authenticated;
GRANT ALL ON public.saved_designs TO service_role;
ALTER TABLE public.saved_designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read by share token" ON public.saved_designs FOR SELECT USING (true);
CREATE POLICY "Users create own designs" ON public.saved_designs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own designs" ON public.saved_designs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own designs" ON public.saved_designs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage designs" ON public.saved_designs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_saved_designs_updated BEFORE UPDATE ON public.saved_designs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Showroom bookings
CREATE TABLE public.showroom_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  showroom_id uuid REFERENCES public.showrooms(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  preferred_date date NOT NULL,
  preferred_time text NOT NULL,
  party_size integer NOT NULL DEFAULT 1,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.showroom_bookings TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.showroom_bookings TO authenticated;
GRANT ALL ON public.showroom_bookings TO service_role;
ALTER TABLE public.showroom_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can request a booking" ON public.showroom_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users read own bookings" ON public.showroom_bookings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Staff update bookings" ON public.showroom_bookings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Admins delete bookings" ON public.showroom_bookings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.showroom_bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sofa_id uuid REFERENCES public.sofas(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text NOT NULL,
  images jsonb NOT NULL DEFAULT '[]',
  city text,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approved reviews" ON public.reviews FOR SELECT USING (approved = true);
CREATE POLICY "Users read own reviews" ON public.reviews FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Users create own reviews" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reviews" ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND approved = false);
CREATE POLICY "Staff moderate reviews" ON public.reviews FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Admins delete reviews" ON public.reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lead time capacity on sofas
ALTER TABLE public.sofas ADD COLUMN IF NOT EXISTS lead_time_days integer NOT NULL DEFAULT 30;
ALTER TABLE public.sofas ADD COLUMN IF NOT EXISTS active_build_slots integer NOT NULL DEFAULT 0;
ALTER TABLE public.sofas ADD COLUMN IF NOT EXISTS max_concurrent_builds integer NOT NULL DEFAULT 20;

-- Seed a coupon replacing the hardcoded welcome
INSERT INTO public.coupons(code, description, discount_type, discount_value, min_order_amount, active)
VALUES ('TF5-WELCOME', 'New customer 5% off', 'percent', 5, 20000, true)
ON CONFLICT (code) DO NOTHING;
