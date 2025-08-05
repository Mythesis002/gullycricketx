-- Check the current structure of community_members table
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'community_members' 
ORDER BY ordinal_position;

-- Check if community_id column exists
SELECT 
    column_name 
FROM information_schema.columns 
WHERE table_name = 'community_members' 
    AND column_name = 'community_id';

-- Check current data in community_members
SELECT 
    id,
    user_id,
    user_name,
    joined_at,
    is_active
FROM community_members
ORDER BY joined_at;

-- Check if there are multiple communities
SELECT 
    id,
    name,
    member_count
FROM community
ORDER BY created_at; 