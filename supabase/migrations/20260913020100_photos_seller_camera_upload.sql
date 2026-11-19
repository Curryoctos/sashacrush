-- Sellers upload the storage object before the photos row exists.
-- Check the land folder in the object path instead of requiring a matching row.

DROP POLICY IF EXISTS "photos_storage_seller_insert" ON storage.objects;

CREATE POLICY "photos_storage_seller_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND public.current_user_role() = 'seller'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.land_records AS land
      WHERE land.id::text = (storage.foldername(name))[1]
        AND public.is_seller_of_land(land.id)
    )
  );
