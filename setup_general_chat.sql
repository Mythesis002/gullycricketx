-- Create generalChatMessages table for GullyCricketX general chat system
-- Run this script in your Supabase SQL editor

-- Create the generalChatMessages table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_general_chat_created_at ON public.generalChatMessages(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_general_chat_userid ON public.generalChatMessages(userid);

-- Enable Row Level Security (RLS)
ALTER TABLE public.generalChatMessages ENABLE ROW LEVEL SECURITY;

-- Create policies for secure access
-- Allow all authenticated users to read messages
CREATE POLICY "Allow read access to all users" ON public.generalChatMessages
  FOR SELECT USING (true);

-- Allow authenticated users to insert their own messages
CREATE POLICY "Allow insert for authenticated users" ON public.generalChatMessages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Insert a welcome message to get started
INSERT INTO public.generalChatMessages (
  userid,
  userName,
  jerseyNumber,
  message,
  messageType,
  createdAt
) VALUES (
  'system',
  'GullyCricketX',
  '🏏',
  'Welcome to the GullyCricketX community! 🏏 Share your cricket moments, discuss strategies, and connect with fellow players!',
  'system',
  EXTRACT(EPOCH FROM NOW()) * 1000
);

-- Grant necessary permissions
GRANT ALL ON public.generalChatMessages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated; 