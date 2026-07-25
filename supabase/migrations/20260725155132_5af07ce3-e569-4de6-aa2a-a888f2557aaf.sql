
-- Enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'customer');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- USER ROLES (separate table, secure)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + assign customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- FABRICS
CREATE TABLE public.fabrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  texture_url TEXT,
  price_modifier NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fabrics TO anon, authenticated;
GRANT ALL ON public.fabrics TO service_role;
ALTER TABLE public.fabrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read fabrics" ON public.fabrics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage fabrics" ON public.fabrics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- COLORS (per fabric)
CREATE TABLE public.colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fabric_id UUID NOT NULL REFERENCES public.fabrics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.colors TO anon, authenticated;
GRANT ALL ON public.colors TO service_role;
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read colors" ON public.colors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage colors" ON public.colors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SIZES
CREATE TABLE public.sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  seater_count INT,
  width_cm INT,
  depth_cm INT,
  height_cm INT,
  price_modifier NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.sizes TO anon, authenticated;
GRANT ALL ON public.sizes TO service_role;
ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sizes" ON public.sizes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage sizes" ON public.sizes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ADD-ONS
CREATE TABLE public.addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.addons TO anon, authenticated;
GRANT ALL ON public.addons TO service_role;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read addons" ON public.addons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage addons" ON public.addons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SOFAS
CREATE TABLE public.sofas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  base_price NUMERIC(10,2) NOT NULL,
  hero_image TEXT,
  gallery TEXT[] DEFAULT '{}',
  model_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sofas TO anon, authenticated;
GRANT ALL ON public.sofas TO service_role;
ALTER TABLE public.sofas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published sofas" ON public.sofas FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "Admins read all sofas" ON public.sofas FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage sofas" ON public.sofas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_sofas_updated BEFORE UPDATE ON public.sofas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- JOIN TABLES for available options per sofa
CREATE TABLE public.sofa_fabrics (
  sofa_id UUID NOT NULL REFERENCES public.sofas(id) ON DELETE CASCADE,
  fabric_id UUID NOT NULL REFERENCES public.fabrics(id) ON DELETE CASCADE,
  PRIMARY KEY (sofa_id, fabric_id)
);
GRANT SELECT ON public.sofa_fabrics TO anon, authenticated;
GRANT ALL ON public.sofa_fabrics TO service_role;
ALTER TABLE public.sofa_fabrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sofa_fabrics" ON public.sofa_fabrics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage sofa_fabrics" ON public.sofa_fabrics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.sofa_sizes (
  sofa_id UUID NOT NULL REFERENCES public.sofas(id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES public.sizes(id) ON DELETE CASCADE,
  PRIMARY KEY (sofa_id, size_id)
);
GRANT SELECT ON public.sofa_sizes TO anon, authenticated;
GRANT ALL ON public.sofa_sizes TO service_role;
ALTER TABLE public.sofa_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sofa_sizes" ON public.sofa_sizes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage sofa_sizes" ON public.sofa_sizes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.sofa_addons (
  sofa_id UUID NOT NULL REFERENCES public.sofas(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.addons(id) ON DELETE CASCADE,
  PRIMARY KEY (sofa_id, addon_id)
);
GRANT SELECT ON public.sofa_addons TO anon, authenticated;
GRANT ALL ON public.sofa_addons TO service_role;
ALTER TABLE public.sofa_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sofa_addons" ON public.sofa_addons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage sofa_addons" ON public.sofa_addons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SHOWROOMS
CREATE TABLE public.showrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  hours TEXT,
  map_url TEXT,
  hero_image TEXT,
  is_flagship BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.showrooms TO anon, authenticated;
GRANT ALL ON public.showrooms TO service_role;
ALTER TABLE public.showrooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read showrooms" ON public.showrooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage showrooms" ON public.showrooms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed demo content
INSERT INTO public.categories (slug, name, description, sort_order) VALUES
  ('modular', 'Modular', 'Reconfigurable modular sofa systems', 1),
  ('sectional', 'Sectional', 'L-shape and U-shape sectionals', 2),
  ('loveseat', 'Loveseat', 'Two-seater intimate lounging', 3);

INSERT INTO public.fabrics (slug, name, description, price_modifier, sort_order) VALUES
  ('boucle', 'Bouclé', 'Thick, textured wool loops. Warm and tactile.', 8000, 1),
  ('velvet', 'Velvet', 'Deep-pile performance velvet with rich sheen.', 6000, 2),
  ('linen', 'Belgian Linen', 'Natural woven linen with a relaxed drape.', 5000, 3),
  ('leather', 'Full-grain Leather', 'Top-grain Italian leather that ages beautifully.', 22000, 4);

INSERT INTO public.colors (fabric_id, name, hex, sort_order)
SELECT id, x.name, x.hex, x.sort_order FROM public.fabrics, (VALUES
  ('boucle','Cream','#EFE7D8',1),('boucle','Oatmeal','#D8CDB8',2),('boucle','Sand','#C7B393',3)
) AS x(fabric_slug,name,hex,sort_order) WHERE fabrics.slug='boucle' AND x.fabric_slug='boucle';

INSERT INTO public.colors (fabric_id, name, hex, sort_order)
SELECT id, x.name, x.hex, x.sort_order FROM public.fabrics, (VALUES
  ('velvet','Deep Navy','#1B1F3A',1),('velvet','Olive','#4C5A34',2),('velvet','Emerald','#1F4B3F',3),('velvet','Rust','#8B3A1B',4)
) AS x(fabric_slug,name,hex,sort_order) WHERE fabrics.slug='velvet' AND x.fabric_slug='velvet';

INSERT INTO public.colors (fabric_id, name, hex, sort_order)
SELECT id, x.name, x.hex, x.sort_order FROM public.fabrics, (VALUES
  ('linen','Natural','#D6C7A8',1),('linen','Slate','#6E7175',2),('linen','Terracotta','#B36A4A',3)
) AS x(fabric_slug,name,hex,sort_order) WHERE fabrics.slug='linen' AND x.fabric_slug='linen';

INSERT INTO public.colors (fabric_id, name, hex, sort_order)
SELECT id, x.name, x.hex, x.sort_order FROM public.fabrics, (VALUES
  ('leather','Cognac','#8C4A28',1),('leather','Espresso','#3A241A',2),('leather','Tan','#B98A5E',3)
) AS x(fabric_slug,name,hex,sort_order) WHERE fabrics.slug='leather' AND x.fabric_slug='leather';

INSERT INTO public.sizes (slug, name, seater_count, width_cm, depth_cm, height_cm, price_modifier, sort_order) VALUES
  ('2s', '2-Seater', 2, 165, 95, 85, 0, 1),
  ('3s', '3-Seater', 3, 215, 95, 85, 12000, 2),
  ('4s', '4-Seater', 4, 265, 95, 85, 24000, 3),
  ('lshape', 'L-Shape', 5, 285, 175, 85, 42000, 4);

INSERT INTO public.addons (slug, name, description, price, icon, sort_order) VALUES
  ('cup-holder', 'Built-in Cup Holder', 'Discreet armrest cup holder in matching finish.', 3500, 'coffee', 1),
  ('foot-rest', 'Foot Rest Pedal', 'Recline mechanism with padded footrest.', 8500, 'footprints', 2),
  ('charging-socket', 'USB-C Charging Socket', 'In-arm dual USB-C port with cable management.', 4500, 'plug', 3),
  ('headrest', 'Adjustable Headrest', 'Ratchet-mechanism headrest, hidden when folded.', 5500, 'chevrons-up', 4),
  ('storage', 'Under-seat Storage', 'Hydraulic lift-up storage compartment.', 6500, 'archive', 5);

-- Featured sofas
INSERT INTO public.sofas (slug, name, tagline, description, category_id, base_price, hero_image, is_featured, is_published, sort_order)
SELECT 'malwa-modular', 'The Malwa Modular', 'Infinite Configurations',
  'A low-profile modular system inspired by the plains of Malwa. Reconfigure the modules to suit every room, every mood.',
  c.id, 68000, '/src/assets/sofa-malwa.jpg', true, true, 1
FROM public.categories c WHERE c.slug='modular';

INSERT INTO public.sofas (slug, name, tagline, description, category_id, base_price, hero_image, is_featured, is_published, sort_order)
SELECT 'ujjain-arch', 'Ujjain Arch Settee', 'Solid Teak Frame',
  'A gently curved settee with hand-tufted back, built on a solid teak frame. A statement piece for classic interiors.',
  c.id, 82000, '/src/assets/sofa-ujjain.jpg', true, true, 2
FROM public.categories c WHERE c.slug='loveseat';

INSERT INTO public.sofas (slug, name, tagline, description, category_id, base_price, hero_image, is_featured, is_published, sort_order)
SELECT 'indore-slimline', 'The Indore Slim-Line', 'Top Grain Leather',
  'A slim-armed three-seater in top-grain Italian leather. Contemporary lines that soften over years of use.',
  c.id, 145000, '/src/assets/sofa-indore.jpg', true, true, 3
FROM public.categories c WHERE c.slug='sectional';

-- Attach all fabrics/sizes/addons to each sofa
INSERT INTO public.sofa_fabrics (sofa_id, fabric_id) SELECT s.id, f.id FROM public.sofas s CROSS JOIN public.fabrics f;
INSERT INTO public.sofa_sizes (sofa_id, size_id) SELECT s.id, z.id FROM public.sofas s CROSS JOIN public.sizes z;
INSERT INTO public.sofa_addons (sofa_id, addon_id) SELECT s.id, a.id FROM public.sofas s CROSS JOIN public.addons a;

-- Showrooms
INSERT INTO public.showrooms (slug, city, name, address, phone, hours, is_flagship, sort_order) VALUES
  ('indore-flagship', 'Indore', 'Indore Flagship', 'Scheme No. 54, Vijay Nagar, Indore, MP 452010', '+91 731 000 0000', 'Mon–Sat: 10:00 AM – 8:00 PM', true, 1),
  ('ujjain-studio', 'Ujjain', 'Ujjain Studio', 'Nanakheda, Near Mahakal Marg, Ujjain, MP 456010', '+91 734 000 0000', 'By Appointment Only · Tue–Sun', false, 2);
