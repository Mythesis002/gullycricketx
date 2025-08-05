-- Test Real-Time Messaging for Web Browsers
-- This script helps verify that real-time subscriptions work properly

-- 1. Check if real-time is enabled in Supabase
SELECT 
    name,
    value
FROM pg_settings 
WHERE name LIKE '%realtime%' OR name LIKE '%websocket%';

-- 2. Check current community_messages table structure
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'community_messages' 
ORDER BY ordinal_position;

-- 3. Check if RLS policies allow real-time subscriptions
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

-- 4. Test inserting a message manually
INSERT INTO public.community_messages (
    sender_id,
    sender_name,
    sender_avatar,
    message,
    message_type,
    community_id,
    created_at
) VALUES (
    'c00da402-558f-4823-b411-22c75b59f551',
    'Test User',
    'https://example.com/avatar.jpg',
    'Test message for real-time verification - ' || NOW(),
    'text',
    'a246805a-aa84-4936-ac5b-5c701363ea66',
    NOW()
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

-- 6. Clean up test message
DELETE FROM public.community_messages WHERE sender_name = 'Test User';

-- 7. Show recent messages for debugging
SELECT 
    id,
    sender_name,
    message,
    created_at,
    community_id
FROM public.community_messages
ORDER BY created_at DESC
LIMIT 5; 