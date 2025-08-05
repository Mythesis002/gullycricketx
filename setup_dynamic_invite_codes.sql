-- Update community table to support dynamic invite codes
-- This script adds the necessary columns for the new invite system

-- Add invite_code_expires_at column to community table
ALTER TABLE community
ADD COLUMN IF NOT EXISTS invite_code_expires_at TIMESTAMP WITH TIME ZONE;

-- Add community_id column to community_members table if it doesn't exist
ALTER TABLE community_members
ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES community(id);

-- Add joined_at column to community_members table
ALTER TABLE community_members
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add community_id column to community_messages table for multi-community support
ALTER TABLE community_messages
ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES community(id);

-- Create unique constraint to prevent duplicate memberships
-- First check if the constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_user_community'
    ) THEN
        ALTER TABLE community_members
        ADD CONSTRAINT unique_user_community
        UNIQUE (user_id, community_id);
    END IF;
END $$;

-- Update existing community_members to have a default community_id if null
-- (This assumes you have at least one community)
UPDATE community_members
SET community_id = (SELECT id::UUID FROM community LIMIT 1)
WHERE community_id IS NULL;

-- Update existing community_messages to have a default community_id if null
UPDATE community_messages
SET community_id = (SELECT id::UUID FROM community LIMIT 1)
WHERE community_id IS NULL;

-- Make community_id NOT NULL after setting default values
ALTER TABLE community_members
ALTER COLUMN community_id SET NOT NULL;

-- Create index for faster invite code lookups
CREATE INDEX IF NOT EXISTS idx_community_invite_code
ON community(invite_code);

-- Create index for faster community member lookups
CREATE INDEX IF NOT EXISTS idx_community_members_user_community
ON community_members(user_id, community_id);

-- Create index for community messages by community
CREATE INDEX IF NOT EXISTS idx_community_messages_community
ON community_messages(community_id);

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read communities they're members of" ON community;
DROP POLICY IF EXISTS "Users can update communities they're members of" ON community;
DROP POLICY IF EXISTS "Users can join communities with valid invite code" ON community;
DROP POLICY IF EXISTS "Users can manage their community memberships" ON community_members;
DROP POLICY IF EXISTS "Users can read messages from their communities" ON community_messages;
DROP POLICY IF EXISTS "Users can send messages to their communities" ON community_messages;

-- Add RLS policies for the new system
-- Policy for users to read communities they're members of
CREATE POLICY "Users can read communities they're members of"
ON community FOR SELECT
USING (
  id::UUID IN (
    SELECT community_id::UUID
    FROM community_members
    WHERE user_id = auth.uid()::text
  )
);

-- Policy for users to update communities they're members of
CREATE POLICY "Users can update communities they're members of"
ON community FOR UPDATE
USING (
  id::UUID IN (
    SELECT community_id::UUID
    FROM community_members
    WHERE user_id = auth.uid()::text
  )
);

-- Policy for users to join communities via invite code
CREATE POLICY "Users can join communities with valid invite code"
ON community FOR SELECT
USING (
  invite_code IS NOT NULL
  AND (invite_code_expires_at IS NULL OR invite_code_expires_at > NOW())
);

-- Policy for users to manage their community memberships
CREATE POLICY "Users can manage their community memberships"
ON community_members FOR ALL
USING (user_id = auth.uid()::text);

-- Policy for users to read messages from communities they're members of
CREATE POLICY "Users can read messages from their communities"
ON community_messages FOR SELECT
USING (
  community_id IN (
    SELECT community_id
    FROM community_members
    WHERE user_id = auth.uid()::text
  )
);

-- Policy for users to send messages to communities they're members of
CREATE POLICY "Users can send messages to their communities"
ON community_messages FOR INSERT
WITH CHECK (
  community_id IN (
    SELECT community_id
    FROM community_members
    WHERE user_id = auth.uid()::text
  )
);

-- Enable RLS on both tables
ALTER TABLE community ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;

-- Insert a default community if none exists
INSERT INTO community (id, name, description, invite_code, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Cricket Community',
  'The main cricket community for GullyCricketX',
  'CRICKET',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM community);

-- Generate a fresh invite code for the default community
UPDATE community
SET
  invite_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)),
  invite_code_expires_at = NOW() + INTERVAL '10 minutes',
  updated_at = NOW()
WHERE name = 'Cricket Community'; 