-- 1) Lock down SECURITY DEFINER function execution
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_order_status_change() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.request_order_action(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_order_action(uuid, text, text) TO authenticated, service_role;

-- Share links must work for signed-out visitors; keep anon but drop blanket PUBLIC grant
REVOKE ALL ON FUNCTION public.get_shared_design(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_design(text) TO anon, authenticated, service_role;

-- 2) Replace always-true INSERT policies with validated ones
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe"
ON public.newsletter_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 5 AND 254
  AND email ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND (city IS NULL OR length(city) <= 100)
  AND (source IS NULL OR length(source) <= 100)
);

DROP POLICY IF EXISTS "Anyone can request a booking" ON public.showroom_bookings;
CREATE POLICY "Anyone can request a booking"
ON public.showroom_bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND length(full_name) BETWEEN 2 AND 100
  AND length(phone) BETWEEN 6 AND 20
  AND (email IS NULL OR length(email) <= 254)
  AND preferred_date IS NOT NULL
  AND length(preferred_time) BETWEEN 1 AND 50
  AND party_size BETWEEN 1 AND 20
  AND (notes IS NULL OR length(notes) <= 2000)
  AND status = 'new'
  AND admin_notes IS NULL
);