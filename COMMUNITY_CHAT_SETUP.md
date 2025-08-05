# 🏏 Community Chat System Setup Guide

## 📋 **Overview**

This guide will help you set up the **Community Chat System** for GullyCricketX. The system provides a single group chat where users can join and communicate with each other.

## 🗄️ **Database Setup**

### **Step 1: Run SQL Script**

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste the contents of `setup_community_chat.sql`
4. Click **Run** to execute the script

This will create:
- `community` table (single group info)
- `community_members` table (user memberships)
- `community_messages` table (chat messages)
- RLS policies for security
- Default community with invite code

### **Step 2: Create Storage Bucket**

1. In Supabase Dashboard, go to **Storage**
2. Click **Create a new bucket**
3. Name it: `chat-images`
4. Set it as **Public bucket**
5. Click **Create bucket**

## 📱 **App Features**

### **✅ What's Working**

1. **Community Header**
   - Shows community name
   - Displays member count
   - Invite button

2. **Real-time Chat**
   - Send text messages
   - Share images
   - Real-time updates
   - Message timestamps

3. **Invite System**
   - Unique invite code
   - Share via native share
   - Copy link functionality

4. **User Management**
   - Auto-join community
   - Member tracking
   - Profile pictures

### **🎯 User Flow**

1. **User opens app** → Sees feed screen
2. **Clicks message icon** → Opens community chat
3. **Automatically joins** → Can start chatting
4. **Clicks invite** → Shares invite link
5. **Friends join** → Via invite link/code

## 🔧 **Technical Details**

### **Database Tables**

```sql
-- Single community
community (id, name, description, invite_code, member_count)

-- Community members
community_members (user_id, user_name, user_avatar, joined_at)

-- Chat messages
community_messages (sender_id, sender_name, message, media_url, created_at)
```

### **Real-time Features**

- **Channel**: `community-chat-messages`
- **Events**: INSERT, UPDATE, DELETE
- **Auto-scroll**: New messages scroll to bottom
- **Image upload**: Supabase Storage integration

### **Security**

- **RLS Policies**: Only authenticated users can participate
- **Member validation**: Only members can send messages
- **Image security**: Public bucket with proper permissions

## 🚀 **Testing**

### **Test Scenarios**

1. **Join Community**
   - Open app → Click message icon
   - Should auto-join and show chat

2. **Send Message**
   - Type message → Click send
   - Should appear in chat immediately

3. **Share Image**
   - Click camera icon → Select image
   - Should upload and display in chat

4. **Invite Friends**
   - Click invite button → Share link
   - Friends should be able to join

## 🐛 **Troubleshooting**

### **Common Issues**

1. **Messages not loading**
   - Check database connection
   - Verify RLS policies
   - Check console for errors

2. **Images not uploading**
   - Verify storage bucket exists
   - Check bucket permissions
   - Ensure bucket is public

3. **Real-time not working**
   - Check Supabase subscription
   - Verify channel name
   - Check network connection

### **Debug Commands**

```sql
-- Check community exists
SELECT * FROM community;

-- Check members
SELECT * FROM community_members;

-- Check messages
SELECT * FROM community_messages ORDER BY created_at DESC LIMIT 10;
```

## 📈 **Next Steps**

### **Future Enhancements**

1. **Message Actions**
   - Reply to messages
   - Forward messages
   - Delete messages

2. **Advanced Features**
   - Typing indicators
   - Read receipts
   - Message search

3. **Admin Features**
   - Manage members
   - Edit community info
   - Moderate messages

## 🎉 **Success!**

Your community chat system is now ready! Users can:
- ✅ Join the community automatically
- ✅ Send text messages
- ✅ Share images
- ✅ Invite friends
- ✅ See real-time updates

The system is **simple, secure, and scalable** - perfect for your cricket community! 🏏 