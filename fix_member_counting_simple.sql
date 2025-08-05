-- Simple Fix for Member Counting Issue
-- This script properly handles UUID types and fixes the member counting problems

-- 1. Check current table structure
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'community_members' 
ORDER BY ordinal_position;

-- 2. Check if community_id column exists and its type
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'community_members' 
    AND column_name = 'community_id';

-- 3. Add community_id column if it doesn't exist (as UUID type)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_members' 
        AND column_name = 'community_id'
    ) THEN
        ALTER TABLE public.community_members 
        ADD COLUMN community_id UUID;
        
        RAISE NOTICE 'Added community_id column (UUID type) to community_members table';
    ELSE
        RAISE NOTICE 'community_id column already exists';
    END IF;
END $$;

-- 4. Get the default community ID and update existing members
DO $$
DECLARE
    default_community_id UUID;
BEGIN
    -- Get the first community
    SELECT id INTO default_community_id 
    FROM public.community 
    LIMIT 1;
    
    IF default_community_id IS NOT NULL THEN
        -- Update existing members to have the default community_id
        UPDATE public.community_members 
        SET community_id = default_community_id 
        WHERE community_id IS NULL;
        
        RAISE NOTICE 'Updated existing members with community_id: %', default_community_id;
    ELSE
        RAISE NOTICE 'No community found, creating default community';
        
        -- Create a default community if none exists
        INSERT INTO public.community (name, description, invite_code, created_by)
        VALUES ('GullyCricketX Community', 'The main cricket community', 'GULLY2024', 'system')
        RETURNING id INTO default_community_id;
        
        -- Update existing members
        UPDATE public.community_members 
        SET community_id = default_community_id 
        WHERE community_id IS NULL;
        
        RAISE NOTICE 'Created default community and updated members with community_id: %', default_community_id;
    END IF;
END $$;

-- 5. Make community_id NOT NULL after populating it
ALTER TABLE public.community_members 
ALTER COLUMN community_id SET NOT NULL;

-- 6. Drop the problematic unique constraint on user_id
ALTER TABLE public.community_members 
DROP CONSTRAINT IF EXISTS community_members_user_id_key;

-- 7. Add a composite unique constraint for user_id and community_id
ALTER TABLE public.community_members 
ADD CONSTRAINT community_members_user_community_unique 
UNIQUE (user_id, community_id);

-- 8. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_community_members_community_user 
ON public.community_members(community_id, user_id);

-- 9. Update all community member counts to be accurate
UPDATE public.community c
SET member_count = (
    SELECT COUNT(*) 
    FROM public.community_members cm 
    WHERE cm.community_id = c.id AND cm.is_active = TRUE
);

-- 10. Verify the fix
SELECT 
    c.id,
    c.name,
    c.member_count as community_member_count,
    COUNT(cm.user_id) as actual_member_count
FROM public.community c
LEFT JOIN public.community_members cm ON c.id = cm.community_id AND cm.is_active = TRUE
GROUP BY c.id, c.name, c.member_count
ORDER BY c.name;

-- 11. Show current members for each community
SELECT 
    c.name as community_name,
    cm.user_name,
    cm.joined_at,
    cm.is_active
FROM public.community c
JOIN public.community_members cm ON c.id = cm.community_id
ORDER BY c.name, cm.joined_at;

-- 12. Check for any duplicate memberships (should be 0)
SELECT
    community_id,
    user_id,
    COUNT(*) as duplicate_count
FROM public.community_members
GROUP BY community_id, user_id
HAVING COUNT(*) > 1; 