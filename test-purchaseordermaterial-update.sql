-- Diagnostic script to test purchaseordermaterial quantity updates
-- Run this in Supabase SQL Editor to test the subtraction logic

-- Step 1: Check existing triggers on purchaseordermaterial
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'purchaseordermaterial'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- Step 2: Check current state of a purchase order material record
-- Replace 'YOUR_POM_ID' with an actual purchaseordermaterial ID
-- SELECT id, rawmaterialid, quantity FROM public.purchaseordermaterial LIMIT 5;

-- Step 3: Test direct update (uncomment and replace ID to test)
-- BEGIN;
-- UPDATE public.purchaseordermaterial 
-- SET quantity = GREATEST(0, quantity - 5) 
-- WHERE id = 'YOUR_POM_ID';
-- SELECT id, quantity FROM public.purchaseordermaterial WHERE id = 'YOUR_POM_ID';
-- ROLLBACK; -- or COMMIT if you want to keep the change

-- Step 4: Check if there are any Row Level Security (RLS) policies
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

-- Step 5: Check table permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'purchaseordermaterial'
  AND table_schema = 'public';


