-- =====================================================
-- SIMPLIFIED CHAT SETUP (NO AUTHENTICATION REQUIRED)
-- Use this for testing if the authenticated version doesn't work
-- =====================================================

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS public.generalChatMessages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userid TEXT NOT NULL,
  userName TEXT NOT NULL,
  jerseyNumber TEXT,
  userAvatar TEXT,
  message TEXT NOT NULL,
  imageUrl TEXT,
  messageType TEXT DEFAULT 'text' CHECK (messageType IN ('text', 'image', 'system')),
  createdAt BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_general_chat_created_at ON public.generalChatMessages(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_general_chat_userid ON public.generalChatMessages(userid);

-- Step 3: Enable RLS
ALTER TABLE public.generalChatMessages ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies
DROP POLICY IF EXISTS "Allow all operations" ON public.generalChatMessages;

-- Step 5: Create a simple policy that allows all operations
CREATE POLICY "Allow all operations" ON public.generalChatMessages
  FOR ALL USING (true) WITH CHECK (true);

-- Step 6: Grant permissions to all users
GRANT ALL ON public.generalChatMessages TO authenticated;
GRANT ALL ON public.generalChatMessages TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Step 7: Insert welcome message
INSERT INTO public.generalChatMessages (userid, userName, jerseyNumber, message, messageType, createdAt) 
VALUES (
  'system', 
  'GullyCricketX', 
  '🏏', 
  'Welcome to the GullyCricketX community! 🏏 Share your cricket moments, discuss strategies, and connect with fellow players!', 
  'system', 
  EXTRACT(EPOCH FROM NOW()) * 1000
) ON CONFLICT DO NOTHING;

-- Step 8: Verify setup
SELECT 'Table created successfully' as status, COUNT(*) as message_count FROM public.generalChatMessages; 