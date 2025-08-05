-- =====================================================
-- CRICKET COMMUNITY SYSTEM - COMPLETE SETUP
-- =====================================================

-- Step 1: Create cricket communities table
CREATE TABLE IF NOT EXISTS public.cricket_communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create community members table
CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES public.cricket_communities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- Step 3: Create followers table (for mutual following)
CREATE TABLE IF NOT EXISTS public.user_followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Step 4: Create community chat messages table
CREATE TABLE IF NOT EXISTS public.community_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES public.cricket_communities(id) ON DELETE CASCADE,
  userid TEXT NOT NULL,
  username TEXT NOT NULL,
  jerseynumber TEXT,
  useravatar TEXT,
  message TEXT NOT NULL,
  imageurl TEXT,
  messagetype TEXT DEFAULT 'text' CHECK (messagetype IN ('text', 'image', 'system')),
  createdat BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_community_members_user ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community ON public.community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON public.user_followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON public.user_followers(following_id);
CREATE INDEX IF NOT EXISTS idx_community_chat_createdat ON public.community_chat_messages(createdat DESC);
CREATE INDEX IF NOT EXISTS idx_community_chat_community ON public.community_chat_messages(community_id);

-- Step 6: Enable Row Level Security (RLS)
ALTER TABLE public.cricket_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_chat_messages ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop existing policies (if any)
DROP POLICY IF EXISTS "Allow community operations" ON public.cricket_communities;
DROP POLICY IF EXISTS "Allow member operations" ON public.community_members;
DROP POLICY IF EXISTS "Allow follower operations" ON public.user_followers;
DROP POLICY IF EXISTS "Allow chat operations" ON public.community_chat_messages;

-- Step 8: Create RLS policies

-- Community policies
CREATE POLICY "Allow community operations" ON public.cricket_communities
  FOR ALL USING (true) WITH CHECK (auth.uid() IS NOT NULL);

-- Member policies
CREATE POLICY "Allow member operations" ON public.community_members
  FOR ALL USING (true) WITH CHECK (auth.uid() IS NOT NULL);

-- Follower policies
CREATE POLICY "Allow follower operations" ON public.user_followers
  FOR ALL USING (true) WITH CHECK (auth.uid() IS NOT NULL);

-- Chat policies - Only members can read/write
CREATE POLICY "Allow chat read for members" ON public.community_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_members 
      WHERE community_id = public.community_chat_messages.community_id 
      AND user_id = auth.uid()::text
    )
  );

CREATE POLICY "Allow chat insert for members" ON public.community_chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members 
      WHERE community_id = public.community_chat_messages.community_id 
      AND user_id = auth.uid()::text
    )
  );

-- Step 9: Grant permissions
GRANT ALL ON public.cricket_communities TO authenticated;
GRANT ALL ON public.community_members TO authenticated;
GRANT ALL ON public.user_followers TO authenticated;
GRANT ALL ON public.community_chat_messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 10: Insert sample data

-- Create sample community
INSERT INTO public.cricket_communities (name, description, logo_url, created_by) 
VALUES (
  'Kallu Cricket Council',
  'The official cricket community for Kallu Cricket Council. Share match moments, discuss strategies, and connect with fellow players!',
  'https://example.com/kallu-cricket-logo.png',
  'adarsh'
) ON CONFLICT (name) DO NOTHING;

-- Add sample members
INSERT INTO public.community_members (community_id, user_id, role) 
SELECT 
  (SELECT id FROM public.cricket_communities WHERE name = 'Kallu Cricket Council'),
  user_id,
  CASE WHEN user_id = 'adarsh' THEN 'admin' ELSE 'member' END
FROM (VALUES ('adarsh'), ('rohit'), ('virat'), ('ms-dhoni')) AS users(user_id)
ON CONFLICT (community_id, user_id) DO NOTHING;

-- Add sample followers (mutual following)
INSERT INTO public.user_followers (follower_id, following_id) 
VALUES 
  ('adarsh', 'rohit'),
  ('rohit', 'adarsh'),
  ('adarsh', 'virat'),
  ('virat', 'adarsh'),
  ('rohit', 'virat'),
  ('virat', 'rohit')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- Add welcome message
INSERT INTO public.community_chat_messages (community_id, userid, username, jerseynumber, message, messagetype, createdat) 
SELECT 
  (SELECT id FROM public.cricket_communities WHERE name = 'Kallu Cricket Council'),
  'system',
  'Kallu Cricket Council',
  '🏏',
  'Welcome to Kallu Cricket Council! 🏏 Share your cricket moments, discuss strategies, and connect with fellow players!',
  'system',
  EXTRACT(EPOCH FROM NOW()) * 1000
ON CONFLICT DO NOTHING;

-- Step 11: Verify setup
SELECT 
  'Setup completed' as status,
  (SELECT COUNT(*) FROM public.cricket_communities) as communities,
  (SELECT COUNT(*) FROM public.community_members) as members,
  (SELECT COUNT(*) FROM public.user_followers) as followers,
  (SELECT COUNT(*) FROM public.community_chat_messages) as messages; 