import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jjzqynriluakcomgqjuz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqenF5bnJpbHVha2NvbWdxanV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNjE2MzIsImV4cCI6MjA2NjkzNzYzMn0.9gJFLNRsxsr2lwzQ9tLMsLfffIx8c0xAvljR2cMess8';
 
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
}); 

// Add ball_by_ball table export if using Supabase JS client
// export const ballByBall = supabase.from('ball_by_ball'); 