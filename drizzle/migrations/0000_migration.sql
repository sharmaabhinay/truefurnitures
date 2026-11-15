DROP POLICY IF EXISTS "Site settings are public to read" ON public.site_settings;
CREATE POLICY "Admins and staff can read site settings" ON public.site_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "Anyone can read product media objects" ON storage.objects;
CREATE POLICY "Admins and staff can read product media objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'product-media' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)));