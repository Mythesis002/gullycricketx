-- Test Message Sending with Correct Data Types
-- This script tests the community_messages table with proper UUID and timestamp formats

-- 1. Check current table structure
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'community_messages' 
ORDER BY ordinal_position;

-- 2. Get a valid community ID
SELECT id, name FROM public.community LIMIT 1;

-- 3. Get a valid user ID (from community_members)
SELECT user_id, user_name FROM public.community_members LIMIT 1;

-- 4. Test inserting a message with correct data types
-- Replace the UUIDs with actual values from your database
INSERT INTO public.community_messages (
    sender_id,
    sender_name,
    sender_avatar,
    message,
    message_type,
    community_id,
    created_at
) VALUES (
    'c00da402-558f-4823-b411-22c75b59f551', -- Replace with actual user_id from step 3
    'Test User',
    'https://example.com/avatar.jpg',
    'Test message with correct data types',
    'text',
    'a246805a-aa84-4936-ac5b-5c701363ea66', -- Replace with actual community_id from step 2
    NOW() -- Use database timestamp
);

-- 5. Check the inserted message
SELECT 
    id,
    sender_id,
    sender_name,
    message,
    created_at,
    community_id
FROM public.community_messages
WHERE sender_name = 'Test User'
ORDER BY created_at DESC
LIMIT 1;

-- 6. Clean up test data
DELETE FROM public.community_messages WHERE sender_name = 'Test User';

-- 7. Verify member count is working
SELECT 
    c.name as community_name,
    c.member_count,
    COUNT(cm.user_id) as actual_member_count
FROM public.community c
LEFT JOIN public.community_members cm ON c.id = cm.community_id
GROUP BY c.id, c.name, c.member_count; 