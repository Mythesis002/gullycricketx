-- Test script to verify member count functionality
-- Run this in your Supabase SQL editor to debug member count issues

-- 1. Check all communities and their member counts
SELECT 
  c.id,
  c.name,
  c.member_count as community_member_count,
  COUNT(cm.user_id) as actual_member_count
FROM community c
LEFT JOIN community_members cm ON c.id = cm.community_id
GROUP BY c.id, c.name, c.member_count
ORDER BY c.name;

-- 2. Check specific community members (replace 'your-community-id' with actual ID)
-- First, get a community ID:
SELECT id, name FROM community LIMIT 1;

-- Then check members for that community (replace the UUID):
SELECT 
  cm.user_id,
  cm.user_name,
  cm.joined_at,
  u.name as user_name_from_users,
  u.profilePicture,
  u.jerseyNumber
FROM community_members cm
LEFT JOIN users u ON cm.user_id::text = u.id::text
WHERE cm.community_id = 'your-community-id-here'
ORDER BY cm.joined_at;

-- 3. Test the exact query that refreshMemberCount uses
SELECT COUNT(*) as member_count
FROM community_members 
WHERE community_id = 'your-community-id-here';

-- 4. Check if there are any duplicate memberships
SELECT 
  community_id,
  user_id,
  COUNT(*) as duplicate_count
FROM community_members
GROUP BY community_id, user_id
HAVING COUNT(*) > 1;

-- 5. Check RLS policies for community_members
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
WHERE tablename = 'community_members';

-- 6. Test if the current user can access community_members
-- (This will show what the current user can see)
SELECT 
  'Current user can see' as test_type,
  COUNT(*) as count
FROM community_members
WHERE community_id = 'your-community-id-here'; 