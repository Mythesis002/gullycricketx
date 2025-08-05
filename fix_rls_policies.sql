-- Fix RLS Policies for Real-time Message Delivery
-- This script resolves type casting issues between UUID and text types

-- First, check the current column types
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('community_members', 'users', 'community_messages')
AND column_name IN ('user_id', 'id', 'community_id')
ORDER BY table_name, column_name;

-- Drop existing RLS policies that depend on user_id
DROP POLICY IF EXISTS "Users can manage their community memberships" ON community_members;
DROP POLICY IF EXISTS "Users can read messages from their communities" ON community_messages;
DROP POLICY IF EXISTS "Users can send messages to their communities" ON community_messages;
DROP POLICY IF EXISTS "Users can read communities they're members of" ON community;

-- Convert user_id from text to uuid in community_members if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_members' 
        AND column_name = 'user_id' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE community_members 
        ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
    END IF;
END $$;

-- Recreate the RLS policies with proper type casting
CREATE POLICY "Users can manage their community memberships"
ON community_members FOR ALL
USING (user_id = auth.uid()::UUID);

CREATE POLICY "Users can read communities they're members of"
ON community FOR SELECT
USING (
  id IN (
    SELECT community_id
    FROM community_members
    WHERE user_id = auth.uid()::UUID
  )
);

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

-- Verify the changes
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('community_members', 'users', 'community_messages')
AND column_name IN ('user_id', 'id', 'community_id')
ORDER BY table_name, column_name;

-- Test the join query that was failing
SELECT 
    cm.id as member_id,
    cm.user_id,
    cm.community_id,
    cm.joined_at,
    u.name,
    u."profilePicture",
    u."jerseyNumber"
FROM community_members cm
LEFT JOIN users u ON cm.user_id = u.id
ORDER BY cm.joined_at DESC
LIMIT 5;

-- Test real-time subscription access
SELECT 
    cm.user_id,
    cm.community_id,
    c.name as community_name
FROM community_members cm
JOIN community c ON cm.community_id = c.id
WHERE cm.user_id = auth.uid()::UUID
LIMIT 5; 