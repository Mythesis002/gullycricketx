-- Test Real-time Setup for Community Messages
-- This script verifies that real-time subscriptions can work properly

-- 1. Check if real-time is enabled for the community_messages table
SELECT 
    schemaname,
    tablename,
    hasreplication,
    hasupdatableview,
    hasinsertableview
FROM pg_tables 
WHERE tablename = 'community_messages';

-- 2. Check RLS policies for community_messages
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
WHERE tablename = 'community_messages';

-- 3. Test if a user can read messages from their community
-- Replace 'YOUR_USER_ID' with an actual user ID from your community
SELECT 
    cm.user_id,
    cm.community_id,
    c.name as community_name,
    COUNT(cm_msg.id) as message_count
FROM community_members cm
JOIN community c ON cm.community_id = c.id
LEFT JOIN community_messages cm_msg ON cm.community_id = cm_msg.community_id
WHERE cm.user_id = 'c00da402-558f-4823-b411-22c75b59f551'::UUID
GROUP BY cm.user_id, cm.community_id, c.name;

-- 4. Check recent messages to verify data structure
SELECT 
    id,
    community_id,
    sender_id,
    sender_name,
    message,
    message_type,
    created_at
FROM community_messages 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Verify community_members structure
SELECT 
    id,
    user_id,
    community_id,
    joined_at
FROM community_members 
ORDER BY joined_at DESC 
LIMIT 5;

-- 6. Test real-time subscription access (this should work for authenticated users)
-- This query simulates what the real-time subscription would check
SELECT 
    cm_msg.id,
    cm_msg.community_id,
    cm_msg.sender_id,
    cm_msg.message
FROM community_messages cm_msg
WHERE cm_msg.community_id IN (
    SELECT community_id 
    FROM community_members 
    WHERE user_id = 'c00da402-558f-4823-b411-22c75b59f551'::UUID
)
ORDER BY cm_msg.created_at DESC 
LIMIT 3; 