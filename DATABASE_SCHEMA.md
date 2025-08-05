# Database Schema Documentation

## Tables

### users
- id (uuid, primary key)
- name (text, not null)
- email (text, unique, not null)
- jerseyNumber (text)
- avatar (text)
- created_at (timestamp with time zone, default: now())
- updated_at (timestamp with time zone, default: now())

### teams
- id (uuid, primary key)
- name (text, not null)
- description (text)
- created_by (uuid, foreign key to users.id)
- created_at (timestamp with time zone, default: now())
- updated_at (timestamp with time zone, default: now())

### matches
- id (uuid, primary key)
- team1_id (uuid, foreign key to teams.id)
- team2_id (uuid, foreign key to teams.id)
- match_title (text, not null)
- match_type (text)
- overs (integer)
- ball_type (text)
- scheduled_at (timestamp with time zone)
- status (text, default: 'scheduled')
- toss_winner (text)
- toss_winner_team (text)
- toss_choice (text)
- toss_result (text)
- toss_call (text)
- toss_caller (text)
- toss_time (timestamp with time zone)
- current_score (text)
- current_overs (text)
- batting_team (text)
- created_at (timestamp with time zone, default: now())
- updated_at (timestamp with time zone, default: now())

### chatMessages
- id (uuid, primary key)
- matchId (uuid, foreign key to matches.id)
- userid (text, not null)
- userName (text, not null)
- jerseyNumber (text)
- message (text, not null)
- imageUrl (text)
- createdAt (bigint, not null)

### generalChatMessages
- id (uuid, primary key)
- userid (text, not null)
- userName (text, not null)
- jerseyNumber (text)
- userAvatar (text)
- message (text, not null)
- imageUrl (text)
- messageType (text, default: 'text') -- 'text', 'image', 'system'
- createdAt (bigint, not null)
- created_at (timestamp with time zone, default: now())

### posts
- id (uuid, primary key)
- userid (text, not null)
- userName (text, not null)
- jerseyNumber (text)
- text (text)
- imageUrl (text)
- videoUrl (text)
- postType (text, default: 'text') -- 'text', 'image', 'video', 'reel'
- likes (integer, default: 0)
- comments (text, default: '0')
- shares (integer, default: 0)
- createdAt (bigint, not null)
- location (text)
- hashtags (text[])
- taggedPlayers (text[])
- matchId (uuid, foreign key to matches.id)

### matchRequests
- id (uuid, primary key)
- matchId (uuid, foreign key to matches.id)
- requesterId (text, not null)
- requesterName (text, not null)
- status (text, default: 'pending') -- 'pending', 'approved', 'rejected'
- createdAt (bigint, not null)

## SQL Commands

### Create generalChatMessages table
```sql
CREATE TABLE generalChatMessages (
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

-- Create index for better performance
CREATE INDEX idx_general_chat_created_at ON generalChatMessages(createdAt DESC);
CREATE INDEX idx_general_chat_userid ON generalChatMessages(userid);
```

### Enable Row Level Security (RLS)
```sql
ALTER TABLE generalChatMessages ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read messages
CREATE POLICY "Allow read access to all users" ON generalChatMessages
  FOR SELECT USING (true);

-- Allow authenticated users to insert their own messages
CREATE POLICY "Allow insert for authenticated users" ON generalChatMessages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

## Notes

- The `generalChatMessages` table is designed for community-wide chat functionality
- Messages are stored with timestamps for proper ordering
- User avatars and jersey numbers are included for better user identification
- Message types allow for different content types (text, image, system messages)
- Row Level Security ensures only authenticated users can participate
- Indexes are created for optimal query performance 