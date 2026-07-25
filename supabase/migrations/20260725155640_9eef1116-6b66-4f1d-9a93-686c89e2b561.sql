
INSERT INTO public.sofas (slug, name, tagline, description, base_price, hero_image, sort_order, is_published)
VALUES
  ('emerald-chesterfield', 'The Emerald Chesterfield', 'Hand-Tufted Velvet', 'A classic chesterfield reimagined in deep emerald velvet with hand-tufted detailing and rolled arms.', 118000, '/src/assets/sofa-emerald.jpg', 4, true),
  ('ivory-curve', 'Ivory Curve Lounger', 'Sculpted Bouclé Silhouette', 'A sculptural curved lounger wrapped in soft ivory bouclé on slim brass legs.', 96000, '/src/assets/sofa-ivory.jpg', 5, true),
  ('terracotta-sectional', 'Terracotta Grand Sectional', 'Modular L-Shape', 'A generous L-shaped sectional in warm terracotta linen — built for long evenings and full families.', 172000, '/src/assets/sofa-terracotta.jpg', 6, true)
ON CONFLICT (slug) DO NOTHING;
