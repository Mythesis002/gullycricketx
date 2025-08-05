# 🎯 Simple Group Invite System

## ✨ Features

### 🔐 Dynamic Invite Codes
- **6-character codes** (e.g., `ABC123`, `XYZ789`)
- **Auto-expire in 10 minutes** for security
- **Unique per group** - each group has its own code

### 🚀 Easy Group Joining
- **Small plus icon** (+) in chat header
- **Simple input box** to paste invite code
- **Instant joining** - no complex setup needed

### 🔄 Easy Group Switching
- **Multiple groups** support
- **Quick switching** between communities
- **Seamless experience** like WhatsApp

## 📱 How to Use

### For Users Joining Groups:
1. **Get invite code** from a friend (e.g., `ABC123`)
2. **Open chat screen** in the app
3. **Tap the small plus icon** (+) in the header
4. **Paste the invite code** in the input box
5. **Tap "Join Group"** - you're in! 🎉

### For Users Inviting Friends:
1. **Open chat screen** in the app
2. **Tap "Invite" button** in the header
3. **Copy the generated code** (e.g., `ABC123`)
4. **Share the code** with friends via any app
5. **Code expires in 10 minutes** for security

## 🗄️ Database Setup

Run this SQL script in your Supabase SQL Editor:

```sql
-- Run the setup_dynamic_invite_codes.sql file
-- This will:
-- 1. Add invite_code_expires_at column
-- 2. Add community_id to community_members
-- 3. Set up proper RLS policies
-- 4. Create indexes for performance
```

## 🔧 Technical Details

### Invite Code Generation:
- **6 random characters**: A-Z, 0-9
- **10-minute expiry**: Automatic expiration
- **Per-group unique**: Each community has its own code

### Security Features:
- **Time-limited codes**: 10-minute expiration
- **RLS policies**: Users can only access their groups
- **Unique constraints**: Prevent duplicate memberships

### Real-time Updates:
- **Community-specific subscriptions**: Only receive messages from current group
- **Instant UI updates**: Messages appear immediately
- **Proper filtering**: Messages are filtered by community_id

## 🎨 UI Components

### JoinGroupModal:
- **Clean, simple design**
- **Large input field** for invite codes
- **Clear feedback** for success/error states
- **Auto-capitalization** for codes

### Updated InviteModal:
- **Dynamic code generation**
- **Expiry timer display**
- **Copy/Share functionality**
- **Security warnings**

### CommunityChat Header:
- **Small plus icon** for joining groups
- **Invite button** for sharing codes
- **Group info display** with member count

## 🚀 Benefits

1. **User-Friendly**: Simple copy-paste system
2. **Secure**: Time-limited codes prevent abuse
3. **Scalable**: Supports multiple groups
4. **Fast**: Instant joining process
5. **Familiar**: Works like popular chat apps

## 🔄 Migration Notes

- **Existing users**: Will be added to default community
- **Existing messages**: Will be associated with default community
- **Backward compatibility**: Old invite system still works
- **Gradual rollout**: New system can be enabled per group

---

**🎉 The new system makes joining groups as simple as sharing a 6-character code!** 