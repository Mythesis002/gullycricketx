-- =====================================================
-- GULLYCRICKETX CHAT SYSTEM - COMPLETE PERMISSIONS SETUP
-- =====================================================

-- Step 1: Create the generalChatMessages table if it doesn't exist
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

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_general_chat_created_at ON public.generalChatMessages(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_general_chat_userid ON public.generalChatMessages(userid);
CREATE INDEX IF NOT EXISTS idx_general_chat_message_type ON public.generalChatMessages(messageType);

-- Step 3: Enable Row Level Security (RLS)
ALTER TABLE public.generalChatMessages ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Allow read access to all users" ON public.generalChatMessages;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.generalChatMessages;
DROP POLICY IF EXISTS "Allow update for message owner" ON public.generalChatMessages;
DROP POLICY IF EXISTS "Allow delete for message owner" ON public.generalChatMessages;

-- Step 5: Create comprehensive RLS policies

-- Policy 1: Allow ALL users to READ messages (public chat)
CREATE POLICY "Allow read access to all users" ON public.generalChatMessages
  FOR SELECT USING (true);

-- Policy 2: Allow authenticated users to INSERT messages
CREATE POLICY "Allow insert for authenticated users" ON public.generalChatMessages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 3: Allow users to UPDATE their own messages
CREATE POLICY "Allow update for message owner" ON public.generalChatMessages
  FOR UPDATE USING (auth.uid()::text = userid);

-- Policy 4: Allow users to DELETE their own messages
CREATE POLICY "Allow delete for message owner" ON public.generalChatMessages
  FOR DELETE USING (auth.uid()::text = userid);

-- Step 6: Grant necessary permissions to authenticated users
GRANT ALL ON public.generalChatMessages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 7: Grant permissions to anon users (for public read access)
GRANT SELECT ON public.generalChatMessages TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Step 8: Insert a welcome message
INSERT INTO public.generalChatMessages (userid, userName, jerseyNumber, message, messageType, createdAt) 
VALUES (
  'system', 
  'GullyCricketX', 
  '🏏', 
  'Welcome to the GullyCricketX community! 🏏 Share your cricket moments, discuss strategies, and connect with fellow players!', 
  'system', 
  EXTRACT(EPOCH FROM NOW()) * 1000
) ON CONFLICT DO NOTHING;

-- Step 9: Verify the setup
SELECT 
  'Table created successfully' as status,
  COUNT(*) as message_count 
FROM public.generalChatMessages;

-- Step 10: Show current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'generalchatmessages';

-- =====================================================
-- TROUBLESHOOTING COMMANDS
-- =====================================================

-- Check if table exists:
-- SELECT EXISTS (
--   SELECT FROM information_schema.tables 
--   WHERE table_schema = 'public' 
--   AND table_name = 'generalchatmessages'
-- );

-- Check RLS status:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'generalchatmessages';

-- Check user permissions:
-- SELECT grantee, privilege_type 
-- FROM information_schema.role_table_grants 
-- WHERE table_name = 'generalchatmessages';

-- Test insert (run this as authenticated user):
-- INSERT INTO public.generalChatMessages (userid, userName, jerseyNumber, message, createdAt) 
-- VALUES ('test-user', 'Test User', '99', 'Test message', EXTRACT(EPOCH FROM NOW()) * 1000);

-- Test select:
-- SELECT * FROM public.generalChatMessages ORDER BY createdAt DESC LIMIT 5; 