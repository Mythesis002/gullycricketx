-- Fix Invite Code Security
-- This script adds proper invite code security features

-- 1. Check current community table structure
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'community' 
ORDER BY ordinal_position;

-- 2. Add invite code expiration column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community' 
        AND column_name = 'invite_code_expires_at'
    ) THEN
        ALTER TABLE public.community 
        ADD COLUMN invite_code_expires_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Added invite_code_expires_at column to community table';
    ELSE
        RAISE NOTICE 'invite_code_expires_at column already exists';
    END IF;
END $$;

-- 3. Add invite code generation timestamp
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community' 
        AND column_name = 'invite_code_generated_at'
    ) THEN
        ALTER TABLE public.community 
        ADD COLUMN invite_code_generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE 'Added invite_code_generated_at column to community table';
    ELSE
        RAISE NOTICE 'invite_code_generated_at column already exists';
    END IF;
END $$;

-- 4. Add invite code usage limit
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community' 
        AND column_name = 'invite_code_max_uses'
    ) THEN
        ALTER TABLE public.community 
        ADD COLUMN invite_code_max_uses INTEGER DEFAULT 10;
        
        RAISE NOTICE 'Added invite_code_max_uses column to community table';
    ELSE
        RAISE NOTICE 'invite_code_max_uses column already exists';
    END IF;
END $$;

-- 5. Add invite code usage count
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community' 
        AND column_name = 'invite_code_used_count'
    ) THEN
        ALTER TABLE public.community 
        ADD COLUMN invite_code_used_count INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Added invite_code_used_count column to community table';
    ELSE
        RAISE NOTICE 'invite_code_used_count column already exists';
    END IF;
END $$;

-- 6. Update existing communities to have proper invite code settings
UPDATE public.community 
SET 
    invite_code_generated_at = NOW(),
    invite_code_expires_at = NOW() + INTERVAL '10 minutes',
    invite_code_max_uses = 10,
    invite_code_used_count = 0
WHERE invite_code_generated_at IS NULL;

-- 7. Create function to generate new invite codes
CREATE OR REPLACE FUNCTION generate_invite_code(community_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
BEGIN
    -- Generate a random 8-character code
    new_code := UPPER(substring(md5(random()::text) from 1 for 8));
    
    -- Update the community with new invite code and reset usage
    UPDATE public.community 
    SET 
        invite_code = new_code,
        invite_code_generated_at = NOW(),
        invite_code_expires_at = NOW() + INTERVAL '10 minutes',
        invite_code_used_count = 0
    WHERE id = community_uuid;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to validate invite codes
CREATE OR REPLACE FUNCTION validate_invite_code(code TEXT)
RETURNS TABLE(
    is_valid BOOLEAN,
    community_id UUID,
    community_name TEXT,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN c.id IS NULL THEN FALSE
            WHEN c.invite_code_expires_at < NOW() THEN FALSE
            WHEN c.invite_code_used_count >= c.invite_code_max_uses THEN FALSE
            ELSE TRUE
        END as is_valid,
        c.id as community_id,
        c.name as community_name,
        CASE 
            WHEN c.id IS NULL THEN 'Invalid invite code'
            WHEN c.invite_code_expires_at < NOW() THEN 'Invite code has expired'
            WHEN c.invite_code_used_count >= c.invite_code_max_uses THEN 'Invite code usage limit reached'
            ELSE 'Valid invite code'
        END as error_message
    FROM public.community c
    WHERE c.invite_code = code;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to increment invite code usage
CREATE OR REPLACE FUNCTION use_invite_code(code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    community_uuid UUID;
BEGIN
    -- Get community ID
    SELECT id INTO community_uuid
    FROM public.community
    WHERE invite_code = code;
    
    IF community_uuid IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Increment usage count
    UPDATE public.community 
    SET invite_code_used_count = invite_code_used_count + 1
    WHERE id = community_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 10. Test the functions
SELECT * FROM validate_invite_code('GULLY2024');

-- 11. Show current community invite code status
SELECT 
    name,
    invite_code,
    invite_code_generated_at,
    invite_code_expires_at,
    invite_code_used_count,
    invite_code_max_uses,
    CASE 
        WHEN invite_code_expires_at < NOW() THEN 'EXPIRED'
        WHEN invite_code_used_count >= invite_code_max_uses THEN 'LIMIT_REACHED'
        ELSE 'VALID'
    END as status
FROM public.community; 