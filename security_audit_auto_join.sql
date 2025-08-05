-- Security Audit: Check for Automatic Community Joining
-- This script identifies any mechanisms that automatically add users to communities

-- 1. Check for any default community assignments
SELECT 
    'Default Community Check' as check_type,
    COUNT(*) as total_members,
    COUNT(DISTINCT community_id) as unique_communities,
    MIN(joined_at) as earliest_join,
    MAX(joined_at) as latest_join
FROM public.community_members;

-- 2. Check if all users are in the same community (indicates auto-join)
SELECT 
    'Same Community Check' as check_type,
    community_id,
    COUNT(*) as member_count,
    COUNT(DISTINCT user_id) as unique_users
FROM public.community_members
GROUP BY community_id
ORDER BY member_count DESC;

-- 3. Check for users who joined multiple communities (should be rare with invite-only)
SELECT 
    'Multiple Communities Check' as check_type,
    user_id,
    COUNT(*) as communities_joined,
    STRING_AGG(community_id::text, ', ') as community_ids
FROM public.community_members
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY communities_joined DESC;

-- 4. Check for any triggers that might auto-join users
SELECT 
    'Trigger Check' as check_type,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'community_members'
   OR action_statement ILIKE '%community_members%'
   OR action_statement ILIKE '%INSERT%community%';

-- 5. Check for any functions that might auto-join users
SELECT 
    'Function Check' as check_type,
    routine_name,
    routine_type,
    LEFT(routine_definition, 200) as function_preview
FROM information_schema.routines 
WHERE routine_definition ILIKE '%community_members%INSERT%'
   OR routine_definition ILIKE '%auto%join%'
   OR routine_definition ILIKE '%default%community%';

-- 6. Check RLS policies for community_members
SELECT 
    'RLS Policy Check' as check_type,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'community_members';

-- 7. Check for any foreign key defaults that might auto-assign community_id
SELECT 
    'Column Default Check' as check_type,
    column_name,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'community_members' 
  AND (column_name = 'community_id' OR column_default IS NOT NULL);

-- 8. Check recent join patterns to identify suspicious activity
SELECT 
    'Recent Joins Check' as check_type,
    DATE(joined_at) as join_date,
    COUNT(*) as joins_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT community_id) as unique_communities
FROM public.community_members
WHERE joined_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(joined_at)
ORDER BY join_date DESC;

-- 9. Check for any users who joined without proper invite codes
-- (This would show users who joined communities they shouldn't have access to)
SELECT 
    'Suspicious Joins Check' as check_type,
    cm.user_id,
    cm.community_id,
    cm.joined_at,
    c.name as community_name,
    c.invite_code as community_invite_code
FROM public.community_members cm
JOIN public.community c ON cm.community_id = c.id
WHERE cm.joined_at >= NOW() - INTERVAL '1 day'
ORDER BY cm.joined_at DESC; 