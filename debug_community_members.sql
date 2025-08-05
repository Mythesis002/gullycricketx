-- Debug script for community members and users
-- Run this in your Supabase SQL editor

-- 1. Check if there are any communities
SELECT 'Communities:' as info, COUNT(*) as count FROM community;

-- 2. Check if there are any community members
SELECT 'Community Members:' as info, COUNT(*) as count FROM community_members;

-- 3. Check if there are any users
SELECT 'Users:' as info, COUNT(*) as count FROM users;

-- 4. Check community members with user details
SELECT 
    cm.id as member_id,
    cm.user_id,
    cm.community_id,
    cm.joined_at,
    u.name,
    u.profilePicture,
    u.jerseyNumber,
    CASE 
        WHEN u.id IS NULL THEN 'User not found'
        ELSE 'User found'
    END as user_status
FROM community_members cm
LEFT JOIN users u ON cm.user_id = u.id
ORDER BY cm.joined_at DESC
LIMIT 10;

-- 5. Check sample users
SELECT 
    id,
    name,
    CASE 
        WHEN profilePicture IS NOT NULL THEN 'Has profile picture'
        ELSE 'No profile picture'
    END as profile_status,
    CASE 
        WHEN jerseyNumber IS NOT NULL THEN jerseyNumber
        ELSE 'No jersey number'
    END as jersey_status,
    created_at
FROM users 
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check if there are any orphaned community members (users that don't exist)
SELECT 
    cm.user_id,
    cm.community_id,
    cm.joined_at
FROM community_members cm
LEFT JOIN users u ON cm.user_id = u.id
WHERE u.id IS NULL;

-- 7. Test the exact query used in the app
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