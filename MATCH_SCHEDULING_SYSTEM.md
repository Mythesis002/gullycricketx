# Match Scheduling System Implementation

## Overview
This system implements a complete match scheduling and approval flow where match requests are sent to team creators (not captains), and only they can accept requests and perform the toss.

## 🔄 Updated Flow

### 1️⃣ Schedule Match
- **User selects**: Their own team (created by them) + Opponent team (from users they follow)
- **Inputs**: Match title, type, overs, ball type, schedule time
- **On "Schedule"**:
  - Creates entry in `match_requests` table
  - `created_by` = current user
  - `receiver_user_id` = opponent team's creator
  - `status` = 'pending'
  - Sends notification to opponent team's creator

### 2️⃣ Opponent Team Creator Accepts
- **When team creator taps accept**:
  - Match request status → 'approved'
  - Redirected to Toss screen
  - Sender gets notification of acceptance

### 3️⃣ Toss System (Team Creator Only)
- Shows 3D toss animation
- Random winner (heads/tails)
- Winner selects: Bat or Bowl
- Saves toss result temporarily

### 4️⃣ Create Match Record After Toss
- **After toss completion**:
  - New row in `matches` table
  - Match details + Team IDs + Toss result
  - Status = 'live'

### 5️⃣ Live Match Visibility
- **All players from both teams** see match in Live Matches section
- **Each player sees**:
  - Teams
  - Toss winner
  - Toss decision
  - Match status: live

## 🧠 Key Features

| Feature | Who Handles It |
|---------|----------------|
| Schedule match | Any user with their own team |
| Match request receiver | Opponent team creator |
| Accept request | Opponent team creator only |
| Toss flow | Handled by opponent team creator |
| Match creation (after toss) | Automatic by system |
| Live match display | All players in both teams |

## 📱 Screens Updated/Created

### 1. **ScheduleMatchScreen.tsx** ✅ Updated
- **Changes**:
  - Added `receiver_user_id` field to match request
  - Sends notification to team creator
  - Updated to use team creator instead of captain

### 2. **MatchRequestApprovalScreen.tsx** ✅ New
- **Purpose**: Team creators approve/decline match requests
- **Features**:
  - Shows match details
  - Accept/Decline buttons
  - Sends notifications to sender
  - Redirects to toss on accept

### 3. **CoinTossScreen.tsx** ✅ Updated
- **Changes**:
  - Only allows team creator who accepted to perform toss
  - Updated text to reflect "team creator" instead of "captain"
  - Uses `receiver_user_id` for authorization

### 4. **NotificationsScreen.tsx** ✅ Updated
- **Changes**:
  - Enabled notifications (was disabled)
  - Handles match request notifications
  - Navigates to approval screen on tap
  - Shows different icons/colors for different notification types

### 5. **MatchesScreen.tsx** ✅ Updated
- **Changes**:
  - Updated to show matches for all team players
  - Fetches team information for display
  - Updated match structure to use new database schema
  - Shows toss information in match cards

### 6. **WaitingForApprovalScreen.tsx** ✅ Updated
- **Changes**:
  - Updated status handling ('approved' instead of 'accepted')
  - Shows appropriate messages for new flow

## 🗄️ Database Schema

### New Fields Added:
- `match_requests.receiver_user_id` - Team creator who receives request
- `notifications.match_request_id` - Links notifications to requests
- Updated `matches` table structure for toss information

### Key Tables:
1. **match_requests** - Stores pending match requests
2. **matches** - Stores created matches after toss
3. **notifications** - Stores user notifications
4. **teams** - Team information with creator
5. **users** - User information
6. **followers** - User follow relationships

## 🔐 Authorization Rules

1. **Match Scheduling**: Any user can schedule if they have a team
2. **Request Approval**: Only team creator (`receiver_user_id`) can accept/decline
3. **Toss**: Only team creator who accepted can perform toss
4. **Match Viewing**: All players in both teams can see live matches

## 📨 Notification System

### Notification Types:
- `match_request` - New match request received
- `match_accepted` - Request accepted by team creator
- `match_declined` - Request declined by team creator

### Notification Flow:
1. Sender schedules → Notification to team creator
2. Team creator accepts → Notification to sender
3. Team creator declines → Notification to sender

## 🎯 User Experience

### For Match Scheduler:
1. Select their team
2. Search and select opponent team
3. Fill match details
4. Send request
5. Wait for approval notification

### For Team Creator:
1. Receive notification of match request
2. View request details in approval screen
3. Accept → Go to toss screen
4. Perform toss → Match created

### For All Players:
1. See live matches in Matches screen
2. View toss results and match details
3. Access chat and analytics for live matches

## 🚀 Next Steps

To complete the implementation:

1. **Database Setup**: Create/update tables according to schema
2. **Navigation**: Add `MatchRequestApprovalScreen` to navigation
3. **Testing**: Test the complete flow end-to-end
4. **UI Polish**: Add loading states and error handling
5. **Real-time Updates**: Implement real-time notifications

## 🔧 Technical Notes

- Uses Supabase for backend
- Real-time subscriptions for live updates
- Proper error handling and loading states
- Responsive design with proper styling
- TypeScript interfaces for type safety 