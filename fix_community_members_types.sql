-- Fix type mismatch in community_members table
-- This script handles RLS policies and converts user_id from text to uuid

-- First, check the current column type
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'community_members' 
AND column_name = 'user_id';

-- Drop existing RLS policies that depend on user_id
DROP POLICY IF EXISTS "Users can manage their community memberships" ON community_members;
DROP POLICY IF EXISTS "Users can read messages from their communities" ON community_messages;
DROP POLICY IF EXISTS "Users can send messages to their communities" ON community_messages;

-- Convert user_id from text to uuid
ALTER TABLE community_members 
ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- Recreate the RLS policies with proper type casting
CREATE POLICY "Users can manage their community memberships"
ON community_members FOR ALL
USING (user_id = auth.uid()::UUID);

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

-- Verify the change
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'community_members' 
AND column_name = 'user_id';

-- Test the join query
SELECT 
    cm.id as member_id,
    cm.user_id,
    cm.community_id,
    cm.joined_at,
    u.name,
    u.profilePicture,
    u.jerseyNumber
FROM community_members cm
LEFT JOIN users u ON cm.user_id = u.id
ORDER BY cm.joined_at DESC
LIMIT 5; 