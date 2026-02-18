
UPDATE profiles p
SET phone = u.raw_user_meta_data->>'phone',
    updated_at = NOW()
FROM auth.users u
WHERE u.id = p.user_id
  AND p.phone IS NULL
  AND u.raw_user_meta_data->>'phone' IS NOT NULL
  AND NULLIF(u.raw_user_meta_data->>'phone', '') IS NOT NULL;
