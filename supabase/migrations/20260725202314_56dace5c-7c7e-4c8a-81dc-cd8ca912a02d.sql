CREATE POLICY "Admins and staff can upload product media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-media'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  )
);

CREATE POLICY "Admins and staff can update product media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-media'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  )
)
WITH CHECK (
  bucket_id = 'product-media'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  )
);

CREATE POLICY "Admins and staff can delete product media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-media'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  )
);

CREATE POLICY "Anyone can read product media objects"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'product-media');