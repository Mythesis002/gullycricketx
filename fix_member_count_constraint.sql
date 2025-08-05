-- Fix the unique constraint on user_id in community_members table
-- This constraint prevents users from being members of multiple communities

-- First, let's check the current constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'community_members' 
    AND tc.constraint_type = 'UNIQUE';

-- Drop the problematic unique constraint on user_id
-- This constraint prevents users from joining multiple communities
ALTER TABLE public.community_members 
DROP CONSTRAINT IF EXISTS community_members_user_id_key;

-- Verify the constraint is dropped
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'community_members' 
    AND tc.constraint_type = 'UNIQUE';

-- Now let's verify the member count is working correctly
-- Check all communities and their member counts
SELECT
  c.id,
  c.name,
  c.member_count as community_member_count,
  COUNT(cm.user_id) as actual_member_count
FROM community c
LEFT JOIN community_members cm ON c.id = cm.community_id
GROUP BY c.id, c.name, c.member_count
ORDER BY c.name;

-- Check specific community members (replace with your community ID)
-- First, get a community ID:
SELECT id, name FROM community LIMIT 1;

-- Then check members for that community (replace the UUID):
-- SELECT
--   cm.user_id,
--   cm.user_name,
--   cm.joined_at,
--   u.name as user_name_from_users,
--   u.profilePicture,
--   u.jerseyNumber
-- FROM community_members cm
-- LEFT JOIN users u ON cm.user_id::text = u.id::text
-- WHERE cm.community_id = 'your-community-id-here'
-- ORDER BY cm.joined_at;

-- Test the exact query that refreshMemberCount uses
-- SELECT COUNT(*) as member_count
-- FROM community_members
-- WHERE community_id = 'your-community-id-here';

-- Check if there are any duplicate memberships (should be 0 after fixing)
SELECT
  community_id,
  user_id,
  COUNT(*) as duplicate_count
FROM community_members
GROUP BY community_id, user_id
HAVING COUNT(*) > 1; 