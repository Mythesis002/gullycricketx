-- Fix Real-time Message Delivery
-- This script ensures proper configuration for real-time message delivery

-- 1. Enable real-time for community_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE community_messages;

-- 2. Verify real-time is enabled (using alternative method)
SELECT 
    schemaname,
    tablename
FROM pg_tables 
WHERE tablename = 'community_messages';

-- 3. Check if the table is in the publication
SELECT 
    pubname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'community_messages';

-- 4. Check and fix RLS policies for real-time access
-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can read messages from their communities" ON community_messages;
DROP POLICY IF EXISTS "Users can send messages to their communities" ON community_messages;

-- Recreate policies with proper real-time support
CREATE POLICY "Users can read messages from their communities"
ON community_messages FOR SELECT
USING (
  community_id IN (
    SELECT community_id
    FROM community_members
    WHERE user_id = auth.uid()::UUID
  )
);

CREATE POLICY "Users can send messages to their communities"
ON community_messages FOR INSERT
WITH CHECK (
  community_id IN (
    SELECT community_id
    FROM community_members
    WHERE user_id = auth.uid()::UUID
  )
);

-- 5. Enable RLS on community_messages if not already enabled
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;

-- 6. Verify the policies are working
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'community_messages'
ORDER BY policyname;

-- 7. Test real-time subscription access
-- This should return messages for authenticated users
SELECT 
    cm_msg.id,
    cm_msg.community_id,
    cm_msg.sender_id,
    cm_msg.sender_name,
    cm_msg.message,
    cm_msg.created_at
FROM community_messages cm_msg
WHERE cm_msg.community_id IN (
    SELECT community_id 
    FROM community_members 
    WHERE user_id = auth.uid()::UUID
)
ORDER BY cm_msg.created_at DESC 
LIMIT 5;

-- 8. Check if there are any permission issues
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'community_messages'
AND grantee = 'anon';

-- 9. Ensure the table has proper indexes for real-time queries
CREATE INDEX IF NOT EXISTS idx_community_messages_community_id 
ON community_messages(community_id);

CREATE INDEX IF NOT EXISTS idx_community_messages_created_at 
ON community_messages(created_at DESC);

-- 10. Verify the indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'community_messages';

-- 11. Test if we can insert a message (this will help verify real-time is working)
-- Note: This is just a test - you can comment it out if you don't want to insert test data
-- INSERT INTO community_messages (community_id, sender_id, sender_name, sender_avatar, message, message_type)
-- SELECT 
--     cm.community_id,
--     cm.user_id,
--     u.name,
--     u."profilePicture",
--     'Test message for real-time verification',
--     'text'
-- FROM community_members cm
-- JOIN users u ON cm.user_id = u.id
-- WHERE cm.user_id = auth.uid()::UUID
-- LIMIT 1; 