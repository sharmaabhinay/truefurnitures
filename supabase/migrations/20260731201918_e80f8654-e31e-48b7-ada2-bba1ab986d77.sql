ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS public.carpenter_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  city text NOT NULL,
  address_line text NOT NULL,
  pincode text,
  work_type text NOT NULL,
  preferred_date date,
  duration text,
  budget_range text,
  details text,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.carpenter_requests TO authenticated;
GRANT INSERT ON public.carpenter_requests TO anon;
GRANT ALL ON public.carpenter_requests TO service_role;

ALTER TABLE public.carpenter_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit a carpenter request" ON public.carpenter_requests;
CREATE POLICY "Anyone can submit a carpenter request"
  ON public.carpenter_requests FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own carpenter requests" ON public.carpenter_requests;
CREATE POLICY "Users can view their own carpenter requests"
  ON public.carpenter_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "Staff manage carpenter requests" ON public.carpenter_requests;
CREATE POLICY "Staff manage carpenter requests"
  ON public.carpenter_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "Admins delete carpenter requests" ON public.carpenter_requests;
CREATE POLICY "Admins delete carpenter requests"
  ON public.carpenter_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS carpenter_requests_updated_at ON public.carpenter_requests;
CREATE TRIGGER carpenter_requests_updated_at BEFORE UPDATE ON public.carpenter_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();