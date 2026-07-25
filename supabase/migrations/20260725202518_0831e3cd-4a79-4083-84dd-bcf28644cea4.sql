ALTER TABLE public.sofas
ADD COLUMN IF NOT EXISTS product_options jsonb NOT NULL DEFAULT '{}'::jsonb;