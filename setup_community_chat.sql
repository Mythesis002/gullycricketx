-- Create Community Chat System for GullyCricketX
-- Run this script in your Supabase SQL editor

-- 1. Create Community Table (Single Group)
CREATE TABLE IF NOT EXISTS public.community (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  avatar_url TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  member_count INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Community Members Table
CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id)
);

-- 3. Create Community Messages Table
CREATE TABLE IF NOT EXISTS public.community_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  media_url TEXT,
  created_at BIGINT NOT NULL,
  created_at_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_community_messages_created_at ON public.community_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_messages_sender_id ON public.community_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON public.community_members(user_id);

-- 5. Enable Row Level Security
ALTER TABLE public.community ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies for community table
CREATE POLICY "Allow read access to all users" ON public.community
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for authenticated users" ON public.community
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow update for community creator" ON public.community
  FOR UPDATE USING (auth.uid()::text = created_by);

-- 7. Create RLS Policies for community_members table
CREATE POLICY "Allow read access to all users" ON public.community_members
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for authenticated users" ON public.community_members
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Allow update for own membership" ON public.community_members
  FOR UPDATE USING (auth.uid()::text = user_id);

-- 8. Create RLS Policies for community_messages table
CREATE POLICY "Allow read access to all users" ON public.community_messages
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for authenticated users" ON public.community_messages
  FOR INSERT WITH CHECK (auth.uid()::text = sender_id);

CREATE POLICY "Allow update for message sender" ON public.community_messages
  FOR UPDATE USING (auth.uid()::text = sender_id);

-- 9. Grant permissions
GRANT ALL ON public.community TO authenticated;
GRANT ALL ON public.community_members TO authenticated;
GRANT ALL ON public.community_messages TO authenticated;

-- 10. Insert default community
INSERT INTO public.community (
  name,
  description,
  invite_code,
  created_by
) VALUES (
  'GullyCricketX Community',
  'The main cricket community for all players',
  'GULLY2024',
  'system'
) ON CONFLICT (name) DO NOTHING;

-- 11. Create storage bucket for chat images
-- Note: This needs to be done in Supabase Dashboard under Storage
-- Bucket name: chat-images
-- Public bucket: true

-- 12. Function to update member count
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community 
    SET member_count = member_count + 1,
        updated_at = NOW()
    WHERE id = (SELECT id FROM public.community LIMIT 1);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community 
    SET member_count = GREATEST(member_count - 1, 0),
        updated_at = NOW()
    WHERE id = (SELECT id FROM public.community LIMIT 1);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 13. Create trigger for member count
CREATE TRIGGER trigger_update_member_count
  AFTER INSERT OR DELETE ON public.community_members
  FOR EACH ROW
  EXECUTE FUNCTION update_community_member_count();

-- 14. Function to get community info with member count
CREATE OR REPLACE FUNCTION get_community_info()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  avatar_url TEXT,
  invite_code TEXT,
  member_count BIGINT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.avatar_url,
    c.invite_code,
    (SELECT COUNT(*) FROM public.community_members WHERE is_active = TRUE),
    c.created_by,
    c.created_at
  FROM public.community c
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Insert welcome message
INSERT INTO public.community_messages (
  sender_id,
  sender_name,
  message,
  message_type,
  created_at
) VALUES (
  'system',
  'GullyCricketX',
  'Welcome to the GullyCricketX Community! 🏏 Share your cricket moments, discuss strategies, and connect with fellow players!',
  'system',
  EXTRACT(EPOCH FROM NOW()) * 1000
) ON CONFLICT DO NOTHING; 