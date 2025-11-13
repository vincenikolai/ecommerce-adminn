-- Check RLS policies on purchaseordermaterial
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'purchaseordermaterial';

-- Also check if RLS is even enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'purchaseordermaterial'
  AND schemaname = 'public';


