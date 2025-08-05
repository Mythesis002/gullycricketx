-- Check for Auto-Join Triggers and Functions
-- This script helps identify any database-level automatic community joining

-- 1. Check for triggers on community_members table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'community_members'
ORDER BY trigger_name;

-- 2. Check for functions that might auto-join users
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition ILIKE '%community_members%'
   OR routine_definition ILIKE '%INSERT%community%'
   OR routine_definition ILIKE '%auto%join%'
ORDER BY routine_name;

-- 3. Check for any RLS policies that might allow automatic insertion
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
WHERE tablename = 'community_members'
ORDER BY policyname;

-- 4. Check if there are any default values or constraints that auto-assign community_id
SELECT 
    column_name,
    column_default,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_name = 'community_members' 
  AND column_name = 'community_id';

-- 5. Check for any foreign key constraints that might cause auto-joining
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'community_members';

-- 6. Check recent community_members insertions to see patterns
SELECT 
    user_id,
    community_id,
    joined_at,
    is_active
FROM public.community_members
ORDER BY joined_at DESC
LIMIT 10; 