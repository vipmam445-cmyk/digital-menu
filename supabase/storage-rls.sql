-- Run this in Supabase Dashboard > SQL Editor
-- Adds RLS policies for the menu-images storage bucket

CREATE POLICY "Public read menu-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

CREATE POLICY "Authenticated insert menu-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated update menu-images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete menu-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
