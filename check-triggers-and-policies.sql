-- STEP 1: Check existing triggers on purchaseordermaterial
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'purchaseordermaterial'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- STEP 2: Check if there are any Row Level Security (RLS) policies
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

-- STEP 3: Check if RLS is enabled on the table
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'purchaseordermaterial'
  AND schemaname = 'public';

-- STEP 4: Get some sample purchaseordermaterial records
SELECT 
  id, 
  purchaseorderid,
  rawmaterialid, 
  quantity,
  unitprice
FROM public.purchaseordermaterial 
LIMIT 5;


