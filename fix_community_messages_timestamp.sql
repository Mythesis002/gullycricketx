-- Fix Community Messages Timestamp Issue
-- This script checks and fixes the timestamp handling in community_messages table

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

-- 2. Check if community_id column exists in community_messages
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'community_messages' 
    AND column_name = 'community_id';

-- 3. Add community_id column to community_messages if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_messages' 
        AND column_name = 'community_id'
    ) THEN
        ALTER TABLE public.community_messages 
        ADD COLUMN community_id UUID;
        
        RAISE NOTICE 'Added community_id column to community_messages table';
    ELSE
        RAISE NOTICE 'community_id column already exists in community_messages';
    END IF;
END $$;

-- 4. Update existing messages to have community_id
DO $$
DECLARE
    default_community_id UUID;
BEGIN
    -- Get the first community
    SELECT id INTO default_community_id 
    FROM public.community 
    LIMIT 1;
    
    IF default_community_id IS NOT NULL THEN
        -- Update existing messages to have the default community_id
        UPDATE public.community_messages 
        SET community_id = default_community_id 
        WHERE community_id IS NULL;
        
        RAISE NOTICE 'Updated existing messages with community_id: %', default_community_id;
    END IF;
END $$;

-- 5. Make community_id NOT NULL after populating it
ALTER TABLE public.community_messages 
ALTER COLUMN community_id SET NOT NULL;

-- 6. Create index for community_id in messages
CREATE INDEX IF NOT EXISTS idx_community_messages_community_id 
ON public.community_messages(community_id);

-- 7. Check current data in community_messages
SELECT 
    id,
    sender_id,
    sender_name,
    message,
    created_at,
    created_at_timestamp,
    community_id
FROM public.community_messages
ORDER BY created_at DESC
LIMIT 5;

-- 8. Test inserting a message with proper timestamp format
-- This will help us understand what format the created_at field expects
INSERT INTO public.community_messages (
    sender_id,
    sender_name,
    message,
    message_type,
    created_at,
    community_id
) VALUES (
    'test-user',
    'Test User',
    'Test message to check timestamp format',
    'text',
    EXTRACT(EPOCH FROM NOW()) * 1000, -- Convert to JavaScript timestamp
    (SELECT id FROM public.community LIMIT 1)
);

-- 9. Check the inserted message
SELECT 
    id,
    sender_id,
    sender_name,
    message,
    created_at,
    created_at_timestamp,
    community_id
FROM public.community_messages
WHERE sender_id = 'test-user'
ORDER BY created_at DESC
LIMIT 1;

-- 10. Clean up test data
DELETE FROM public.community_messages WHERE sender_id = 'test-user'; 