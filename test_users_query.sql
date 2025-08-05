-- Test script to check users table and community members
-- Run this in your Supabase SQL editor

-- 1. Check users table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if there are any users
SELECT COUNT(*) as total_users FROM users;

-- 3. Check sample user data
SELECT 
    id,
    name,
    profilePicture,
    jerseyNumber,
    created_at
FROM users 
LIMIT 5;

-- 4. Check community table
SELECT * FROM community LIMIT 1;

-- 5. Check community_members table
SELECT 
    cm.id,
    cm.user_id,
    cm.community_id,
    cm.joined_at,
    u.name,
    u.profilePicture,
    u.jerseyNumber
FROM community_members cm
LEFT JOIN users u ON cm.user_id = u.id
LIMIT 10;

-- 6. Test the exact query we're using in the app
SELECT 
    u.id,
    u.name,
    u.profilePicture,
    u.jerseyNumber
FROM users u
WHERE u.id IN (
    SELECT user_id 
    FROM community_members 
    WHERE community_id = (SELECT id FROM community LIMIT 1)
)
LIMIT 10; 