DROP POLICY IF EXISTS "Public read by share token" ON public.saved_designs;

CREATE POLICY "Users read own designs" ON public.saved_designs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_shared_design(p_token text)
RETURNS TABLE(
  id uuid,
  name text,
  config jsonb,
  sofa_slug text,
  sofa_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.name,
    d.config,
    s.slug AS sofa_slug,
    s.name AS sofa_name
  FROM public.saved_designs d
  LEFT JOIN public.sofas s ON s.id = d.sofa_id
  WHERE d.share_token = p_token;
$$;

REVOKE ALL ON FUNCTION public.get_shared_design(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_design(text) TO anon, authenticated;
