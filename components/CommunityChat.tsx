import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../utils/supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import InviteModal from './InviteModal';
import JoinGroupModal from './JoinGroupModal';
import CommunityMembersList from './CommunityMembersList';
import { debugChatSystem, testMessageSending, debugRealTimeSubscription } from '../utils/chat-debugger';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  message: string;
  message_type: 'text' | 'image' | 'system';
  media_url?: string;
  created_at: number;
  isUploading?: boolean;
  uploadFailed?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

interface Community {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  invite_code: string;
  member_count: number;
  created_by: string;
}

interface User {
  id: string;
  name: string;
  profile_picture?: string;
}

interface CommunityChatProps {
  isActive?: boolean;
}

export default function CommunityChat({ isActive = true }: CommunityChatProps) {
  const navigation = useNavigation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(0);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showJoinInterface, setShowJoinInterface] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [realTimeStatus, setRealTimeStatus] = useState<string>('connecting');
  const [lastMessageCheck, setLastMessageCheck] = useState<number>(Date.now());
  const [fallbackPollingInterval, setFallbackPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Simple fallback polling for web browsers
  // Send delivery confirmation for messages
  const sendDeliveryConfirmation = async (messageId: string) => {
    try {
      console.log('📨 Sending delivery confirmation for message:', messageId);
      
      // Update message status to delivered
      const { error } = await supabase
        .from('community_messages')
        .update({ status: 'delivered' })
        .eq('id', messageId);
      
      if (error) {
        console.error('❌ Error updating message status:', error);
      } else {
        console.log('✅ Message status updated to delivered');
      }
    } catch (error) {
      console.error('❌ Exception in delivery confirmation:', error);
    }
  };

  const startFallbackPolling = () => {
    console.log('🔄 Starting fallback polling');
    
    if (fallbackPollingInterval) {
      clearInterval(fallbackPollingInterval);
    }
    
    const interval = setInterval(async () => {
      if (!community?.id) return;
      
      try {
        const { data: newMessages, error } = await supabase
          .from('community_messages')
          .select('*')
          .eq('community_id', community.id)
          .gt('created_at', new Date(lastMessageCheck).toISOString())
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('❌ Polling error:', error);
          return;
        }
        
        if (newMessages && newMessages.length > 0) {
          console.log('📨 Polling found new messages:', newMessages.length);
          
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const messagesToAdd = newMessages
              .filter(msg => !existingIds.has(msg.id))
              .map(msg => ({
                id: msg.id,
                sender_id: msg.sender_id,
                sender_name: msg.sender_name,
                sender_avatar: msg.sender_avatar,
                message: msg.message,
                media_url: msg.media_url,
                message_type: msg.message_type || 'text',
                created_at: typeof msg.created_at === 'string' 
                  ? new Date(msg.created_at).getTime() 
                  : msg.created_at,
                isUploading: false,
                uploadFailed: false
              }));
            
            if (messagesToAdd.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
              return [...prev, ...messagesToAdd];
            }
            return prev;
          });
          
          setLastMessageCheck(Date.now());
        }
      } catch (error) {
        console.error('❌ Polling exception:', error);
      }
    }, 2000); // Poll every 2 seconds
    
    setFallbackPollingInterval(interval);
  };

  // Debug function to check for duplicate keys
  const checkForDuplicateKeys = (messages: Message[]) => {
    const keys = messages.map((msg, index) => `${msg.id}-${msg.created_at}-${msg.sender_id}-${index}`);
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
    
    if (duplicates.length > 0) {
      console.warn('⚠️ Duplicate keys detected:', duplicates);
      console.warn('⚠️ Messages with duplicate keys:', 
        messages.filter((msg, index) => {
          const key = `${msg.id}-${msg.created_at}-${msg.sender_id}-${index}`;
          return keys.indexOf(key) !== index;
        }).map(msg => ({
          id: msg.id,
          created_at: msg.created_at,
          sender_id: msg.sender_id,
          message: msg.message.substring(0, 30) + '...'
        }))
      );
    }
  };

  // Function to refresh member count
  const refreshMemberCount = async () => {
    if (!community?.id) {
      console.log('❌ No community ID available for member count refresh');
      return;
    }
    
    try {
      console.log('🔄 Refreshing member count for community:', community.id, community.name);
      
      // Try to get members with community_id first (new structure)
      let membersQuery = supabase
        .from('community_members')
        .select('user_id, user_name, joined_at, community_id')
        .eq('community_id', community.id);

      const { data: members, error: membersError } = await membersQuery;

      if (membersError) {
        console.error('❌ Error fetching members with community_id:', membersError);
        
        // Fallback: try without community_id filter (old structure)
        console.log('🔄 Trying fallback query without community_id filter...');
        const { data: fallbackMembers, error: fallbackError } = await supabase
          .from('community_members')
          .select('user_id, user_name, joined_at');

        if (fallbackError) {
          console.error('❌ Error with fallback query:', fallbackError);
          return;
        }

        console.log('👥 Fallback members count:', fallbackMembers?.length || 0);
        setMemberCount(fallbackMembers?.length || 0);
        return;
      }

      console.log('👥 Current members in database:', members?.length || 0, members);

      // Get the count using the same approach
      const { count, error } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', community.id);

      if (error) {
        console.error('❌ Error fetching member count:', error);
        return;
      }

      const newCount = count || 0;
      console.log('📊 Updated member count:', newCount, 'for community:', community.name);
      console.log('📊 Previous count was:', memberCount);
      
      if (newCount !== memberCount) {
        console.log('✅ Member count changed from', memberCount, 'to', newCount);
      }
      
      setMemberCount(newCount);
    } catch (error) {
      console.error('❌ Exception in refreshMemberCount:', error);
    }
  };



  useEffect(() => {
    initializeChat();
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Re-fetch messages and member count when component becomes active
  useEffect(() => {
    if (isActive && community) {
      console.log('🔄 Component became active, re-fetching messages and member count...');
      fetchMessages();
      refreshMemberCount();
    }
  }, [isActive, community]);

  // Refresh member count when community changes
  useEffect(() => {
    if (community?.id) {
      console.log('🔄 Community changed, refreshing member count...');
      refreshMemberCount();
    }
  }, [community?.id]);

  // Phase 2: Real-Time Delivery with WebSocket connection
  useEffect(() => {
    if (!community?.id || !currentUser?.id) return;

    console.log('🔌 Phase 2: Setting up WebSocket real-time for community:', community.id);

    // Create a unique channel for this community
    const channelName = `chat_${community.id}_${Date.now()}`;
    const channel = supabase.channel(channelName);
    
    console.log('🔌 WebSocket channel created:', channelName);
    
    // Subscribe to new messages
    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_messages',
          filter: `community_id=eq.${community.id}`
        },
        (payload) => {
          console.log('📨 WebSocket: New message received!', payload);
          
          const newMessage = payload.new;
          
          // Skip our own messages (they're already in UI optimistically)
          if (newMessage.sender_id === currentUser.id) {
            console.log('🔄 WebSocket: Skipping own message');
            return;
          }
          
          console.log('✅ WebSocket: Processing message from other user');
          
          // Format message for UI with status
            const formattedMessage = {
              id: newMessage.id,
              sender_id: newMessage.sender_id,
              sender_name: newMessage.sender_name,
              sender_avatar: newMessage.sender_avatar,
              message: newMessage.message,
            message_type: newMessage.message_type || 'text',
            media_url: newMessage.media_url,
              created_at: typeof newMessage.created_at === 'string' 
                ? new Date(newMessage.created_at).getTime() 
                : newMessage.created_at,
            isUploading: false,
            uploadFailed: false,
            status: 'delivered' // Mark as delivered
          };
          
          setMessages(prev => {
            // Prevent duplicates
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) {
              console.log('🔄 WebSocket: Message already exists, skipping');
              return prev;
            }
            
            console.log('✅ WebSocket: Adding message to UI instantly');
            const updatedMessages = [...prev, formattedMessage];
            
            // Auto-scroll to show new message
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
            
            return updatedMessages;
          });
          
          // Send delivery confirmation
          sendDeliveryConfirmation(newMessage.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'community_messages',
          filter: `community_id=eq.${community.id}`
        },
        (payload) => {
          console.log('📝 WebSocket: Message status updated:', payload);
          
          // Update message status in UI
          const updatedMessage = payload.new;
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === updatedMessage.id 
                ? { ...msg, status: updatedMessage.status || msg.status }
                : msg
            )
          );
        }
      )
      .subscribe((status) => {
        console.log('🔌 WebSocket connection status:', status);
        setRealTimeStatus(status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ WebSocket: Connected successfully!');
          // Stop fallback polling
          if (fallbackPollingInterval) {
            clearInterval(fallbackPollingInterval);
            setFallbackPollingInterval(null);
            console.log('🔄 WebSocket: Stopped fallback polling');
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ WebSocket: Channel error, starting fallback');
          startFallbackPolling();
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ WebSocket: Connection timed out, starting fallback');
          startFallbackPolling();
        } else if (status === 'CLOSED') {
          console.log('🔌 WebSocket: Connection closed');
        }
      });

    // Store subscription for cleanup
    setSubscription(subscription);

    // Start fallback polling for web browsers
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform: Starting fallback polling');
      setTimeout(() => {
        startFallbackPolling();
      }, 2000); // 2 second delay
    }

    // Cleanup on unmount
    return () => {
      console.log('🔌 WebSocket: Cleaning up subscription');
      subscription.unsubscribe();
      
      if (fallbackPollingInterval) {
        clearInterval(fallbackPollingInterval);
        setFallbackPollingInterval(null);
      }
    };
  }, [community?.id, currentUser?.id]);

  // Handle typing indicators
  const handleTyping = (isUserTyping: boolean) => {
    if (!community?.id || !currentUser?.id) return;
    
    setIsTyping(isUserTyping);
    
    // Broadcast typing status to other users
    const channel = supabase.channel(`community_messages_${community.id}`);
    
    if (isUserTyping) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: currentUser.id, user_name: currentUser.name }
      });
    } else {
      channel.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { user_id: currentUser.id }
      });
    }
  };

  const initializeChat = async () => {
    try {
      setLoading(true);
      
      // Get current user info
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      console.log('🔍 Auth session:', { userId, session: !!session });
      
      if (userId) {
                 const { data: userProfile, error: userError } = await supabase
           .from('users')
           .select('name, "profilePicture"')
           .eq('id', userId)
           .single();
        
        console.log('👤 User profile:', { userProfile, userError });
        
        if (userProfile) {
                     const user = {
             id: userId,
             name: userProfile.name,
             profile_picture: userProfile.profilePicture,
             isOnline: true
           };
          setCurrentUser(user);
          console.log('✅ Current user set:', user);
        } else {
          console.error('❌ No user profile found for ID:', userId);
        }
      } else {
        console.error('❌ No user ID found in session');
      }
      
      // Get community info
      await fetchCommunityInfo();
      
      // Fetch messages only if user is a member of a community
      if (community) {
      await fetchMessages();
      }
      
             // Add welcome message if no messages exist
       // We'll check this after fetching messages
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunityInfo = async () => {
    try {
      // Get current user's communities
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) return;

      // Get the first community the user is a member of
      let userCommunitiesQuery = supabase
        .from('community_members')
        .select(`
          community_id,
          community:community(*)
        `)
        .eq('user_id', userId)
        .limit(1);

      const { data: userCommunities, error: communitiesError } = await userCommunitiesQuery;

      if (communitiesError) {
        console.error('Error fetching user communities with community_id:', communitiesError);
        console.log('❌ Security: Not using fallback - users must join via invite codes');
        setCommunity(null);
          return;
      }

      if (communitiesError && !fallbackCommunities) {
        console.error('Error fetching user communities:', communitiesError);
        return;
      }

      if (!userCommunities || userCommunities.length === 0) {
        console.log('User is not a member of any community - they need to join via invite code');
        // Don't automatically join users to communities - they must use invite codes
        setCommunity(null);
          return;
      } else {
        const communityData = userCommunities[0].community;
        setCommunity(communityData);
        setEditingName(communityData.name || '');
        setEditingDescription(communityData.description || '');
        
        // Get member count for this specific community
        await refreshMemberCount();
      }
    } catch (error) {
      console.error('Error fetching community info:', error);
    }
  };

  const joinCommunity = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    setJoining(true);
    try {
      // Find community by invite code
      const { data: community, error: communityError } = await supabase
        .from('community')
        .select('*')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single();

      if (communityError || !community) {
        Alert.alert('Error', 'Invalid invite code. Please check and try again.');
        return;
      }

      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        Alert.alert('Error', 'Please log in to join communities');
        return;
      }

      // Get user profile
      const { data: userProfile } = await supabase
        .from('users')
        .select('name, "profilePicture"')
        .eq('id', userId)
        .single();

      // Check if user is already a member
      const { data: existingMember } = await supabase
          .from('community_members')
        .select('id')
        .eq('user_id', userId)
        .eq('community_id', community.id)
        .single();

      if (existingMember) {
        Alert.alert('Already a Member', 'You are already a member of this community!');
        setInviteCode('');
        setShowJoinInterface(false);
          return;
      }

      // Join the community
      const { error: joinError } = await supabase
        .from('community_members')
        .insert({
          user_id: userId,
          user_name: userProfile?.name || 'Anonymous',
          user_avatar: userProfile?.profilePicture,
          community_id: community.id,
          joined_at: new Date().toISOString(),
          is_active: true
        });

      if (joinError) {
        console.error('Error joining community:', joinError);
        Alert.alert('Error', 'Failed to join community. Please try again.');
        return;
      }

      Alert.alert(
        'Success! 🎉', 
        `You've joined "${community.name}"!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setInviteCode('');
              setShowJoinInterface(false);
              // Refresh community info and messages
              fetchCommunityInfo();
              fetchMessages();
              refreshMemberCount();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error joining community:', error);
      Alert.alert('Error', 'Failed to join community. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const fetchMessages = async () => {
    if (!community) return;
    
    try {
      const { data: allMessages, error } = await supabase
        .from('community_messages')
        .select('*')
        .eq('community_id', community.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      const formattedMessages = (allMessages || []).map(msg => ({
        id: msg.id,
        sender_id: msg.sender_id,
        sender_name: msg.sender_name,
        sender_avatar: msg.sender_avatar,
        message: msg.message,
        media_url: msg.media_url,
        message_type: msg.message_type || 'text',
        created_at: typeof msg.created_at === 'string' 
          ? new Date(msg.created_at).getTime() 
          : (typeof msg.created_at === 'number' ? msg.created_at : Date.now()),
        isUploading: false,
        uploadFailed: false
      }));

      setMessages(formattedMessages);
      checkForDuplicateKeys(formattedMessages);

      // Add welcome message only if there are no messages at all
      if (formattedMessages.length === 0) {
        console.log('📝 No messages found, adding welcome message');
        await addWelcomeMessage();
      } else {
        console.log(`📝 Found ${formattedMessages.length} existing messages, skipping welcome message`);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

       const addWelcomeMessage = async () => {
    if (!community) return;
    
    // Check if a welcome message already exists for this community
    const { data: existingWelcome } = await supabase
      .from('community_messages')
      .select('id')
      .eq('sender_id', 'system')
      .eq('message_type', 'system')
      .eq('community_id', community.id)
      .limit(1);

    if (existingWelcome && existingWelcome.length > 0) {
      console.log('📝 Welcome message already exists for this community, skipping');
      return;
    }

    const welcomeMessage = {
      sender_id: '00000000-0000-0000-0000-000000000000', // Use a valid UUID for system messages
      sender_name: 'GullyCricketX',
      message: `🎉 Welcome to ${community?.name || 'the Cricket Community'}! 🏏 Share your cricket moments, discuss strategies, and connect with fellow players! Let's make this the best cricket community ever! 🚀`,
      message_type: 'system',
      community_id: community.id,
      created_at: new Date().toISOString() // Send as ISO timestamp string
    };

    try {
      await supabase.from('community_messages').insert([welcomeMessage]);
      console.log('📝 Welcome message added successfully');
    } catch (error) {
      console.error('Error adding welcome message:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !currentUser) {
      console.log('❌ Send message blocked:', {
        messageEmpty: !newMessage.trim(),
        sending,
        noUser: !currentUser,
        currentUser: currentUser?.id
      });
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    setSending(true);

    // Create optimistic message for instant display
    const optimisticMessage: Message = {
      id: `temp_${Date.now()}_${Math.random()}`, // Temporary ID
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_avatar: currentUser.profile_picture,
      message: messageText,
      message_type: 'text',
      created_at: Date.now(),
      isUploading: false,
      uploadFailed: false
    };

    // Add optimistic message immediately
    setMessages(prev => {
      const newMessages = [...prev, optimisticMessage];
      checkForDuplicateKeys(newMessages);
      return newMessages;
    });

    // Scroll to bottom immediately
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      console.log('📤 Attempting to send message:', {
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        message: messageText
      });

             const messageData = {
         sender_id: currentUser.id,
         sender_name: currentUser.name,
         sender_avatar: currentUser.profile_picture,
        message: messageText,
         message_type: 'text',
         community_id: community?.id,
        created_at: new Date().toISOString()
       };

      console.log('📤 Message data:', messageData);

      const { data, error } = await supabase
        .from('community_messages')
        .insert([messageData])
        .select();

      if (error) {
        console.error('❌ Error sending message:', error);
        
        // Remove optimistic message and show error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        Alert.alert('Error', `Failed to send message: ${error.message}`);
        return;
      }

      console.log('✅ Message sent successfully:', data);
      
      // Replace optimistic message with real message
      if (data && data[0]) {
        const realMessage: Message = {
          id: data[0].id,
          sender_id: data[0].sender_id,
          sender_name: data[0].sender_name,
          sender_avatar: data[0].sender_avatar,
          message: data[0].message,
          message_type: data[0].message_type || 'text',
          media_url: data[0].media_url,
          created_at: typeof data[0].created_at === 'string' 
            ? new Date(data[0].created_at).getTime() 
            : data[0].created_at,
          isUploading: false,
          uploadFailed: false
        };
        
        setMessages(prev => {
          // Replace optimistic message with real message
          const updatedMessages = prev.map(msg => 
            msg.id === optimisticMessage.id ? realMessage : msg
          );
          checkForDuplicateKeys(updatedMessages);
          return updatedMessages;
        });
      }
      
      // Stop typing indicator when message is sent
      handleTyping(false);
    } catch (error) {
      console.error('❌ Exception sending message:', error);
      
      // Remove optimistic message and show error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

     const retryImageUpload = async (failedMessage: Message) => {
     if (!failedMessage.media_url) return;
     
     // Remove the failed message
     setMessages(prev => prev.filter(msg => msg.id !== failedMessage.id));
     
     // Retry the upload with the original image URI
     await sendImageMessage(failedMessage.media_url);
   };

   const pickImage = async () => {
     if (!currentUser) {
       Alert.alert('Error', 'Please log in to share images');
       return;
     }

     const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
     
     if (status !== 'granted') {
       Alert.alert('Permission needed', 'Please grant camera roll permissions to share images.');
       return;
     }

     const result = await ImagePicker.launchImageLibraryAsync({
       mediaTypes: ImagePicker.MediaTypeOptions.Images,
       allowsEditing: true,
       aspect: [16, 9],
       quality: 0.8,
     });

     if (!result.canceled && result.assets[0]) {
       await sendImageMessage(result.assets[0].uri);
     }
   };

     const sendImageMessage = async (imageUri: string) => {
     if (!currentUser) return;

     // Create a temporary message ID for the uploading state
     const tempMessageId = `temp-${Date.now()}-${Math.random()}`;
     
     // Add uploading message to UI immediately
     const uploadingMessage: Message = {
       id: tempMessageId,
       sender_id: currentUser.id,
       sender_name: currentUser.name,
       sender_avatar: currentUser.profile_picture,
       message: '📷 Uploading image...',
       message_type: 'image',
       media_url: imageUri, // Use local URI for immediate display
       created_at: Date.now(), // Keep as number for UI display
       isUploading: true // Add this flag to track upload status
     };
     
     setMessages(prev => [...prev, uploadingMessage]);
     
     // Scroll to bottom immediately
     setTimeout(() => {
       flatListRef.current?.scrollToEnd({ animated: true });
     }, 100);

     setSending(true);
     try {
       console.log('📤 Starting image upload...');
       
       // Upload image to Supabase Storage
       const fileName = `chat-images/${Date.now()}-${Math.random()}.jpg`;
       const { data: uploadData, error: uploadError } = await supabase.storage
         .from('chat-images')
         .upload(fileName, {
           uri: imageUri,
           type: 'image/jpeg',
           name: 'image.jpg'
         });

       if (uploadError) {
         console.error('❌ Error uploading image:', uploadError);
         // Update the message to show upload failed
         setMessages(prev => prev.map(msg => 
           msg.id === tempMessageId 
             ? { ...msg, message: '❌ Failed to upload image', isUploading: false, uploadFailed: true }
             : msg
         ));
         Alert.alert('Error', 'Failed to upload image');
         return;
       }

       console.log('✅ Image uploaded successfully, getting public URL...');

       // Get public URL
       const { data: { publicUrl } } = supabase.storage
         .from('chat-images')
         .getPublicUrl(fileName);

       const messageData = {
         sender_id: currentUser.id, // This should be a UUID string
         sender_name: currentUser.name,
         sender_avatar: currentUser.profile_picture,
         message: '📷 Shared an image',
         media_url: publicUrl,
         message_type: 'image',
         community_id: community?.id,
         created_at: new Date().toISOString() // Send as ISO timestamp string
       };

       console.log('📤 Sending image message to database...');

       const { data, error } = await supabase
         .from('community_messages')
         .insert([messageData])
         .select();

       if (error) {
         console.error('❌ Error sending image message:', error);
         // Update the message to show send failed
         setMessages(prev => prev.map(msg => 
           msg.id === tempMessageId 
             ? { ...msg, message: '❌ Failed to send image', isUploading: false, uploadFailed: true }
             : msg
         ));
         Alert.alert('Error', 'Failed to send image');
         return;
       }

       console.log('✅ Image message sent successfully:', data);

       // Replace the uploading message with the real message
       if (data && data[0]) {
         const newMessageObj: Message = {
           id: data[0].id,
           sender_id: data[0].sender_id,
           sender_name: data[0].sender_name,
           sender_avatar: data[0].sender_avatar,
           message: data[0].message,
           message_type: data[0].message_type || 'image',
           media_url: data[0].media_url,
           created_at: typeof data[0].created_at === 'string' 
             ? new Date(data[0].created_at).getTime() 
             : data[0].created_at
         };
         
         setMessages(prev => {
           const newMessages = prev.map(msg => 
             msg.id === tempMessageId ? newMessageObj : msg
           );
           checkForDuplicateKeys(newMessages);
           return newMessages;
         });
         
         // Scroll to bottom
         setTimeout(() => {
           flatListRef.current?.scrollToEnd({ animated: true });
         }, 100);
       }
     } catch (error) {
       console.error('❌ Exception sending image:', error);
       // Update the message to show upload failed
       setMessages(prev => prev.map(msg => 
         msg.id === tempMessageId 
           ? { ...msg, message: '❌ Failed to upload image', isUploading: false, uploadFailed: true }
           : msg
       ));
       Alert.alert('Error', 'Failed to send image');
     } finally {
       setSending(false);
     }
   };

  const updateCommunityInfo = async () => {
    if (!community || !editingName.trim()) {
      Alert.alert('Error', 'Please enter a community name');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('community')
        .update({
          name: editingName.trim(),
          description: editingDescription.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', community.id);

      if (error) {
        console.error('Error updating community:', error);
        Alert.alert('Error', 'Failed to update community');
        return;
      }

      // Refresh community info
      await fetchCommunityInfo();
      setShowEditModal(false);
      Alert.alert('Success', 'Community updated successfully!');
    } catch (error) {
      console.error('Error updating community:', error);
      Alert.alert('Error', 'Failed to update community');
    } finally {
      setSaving(false);
    }
  };

  const pickCommunityLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to select logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0] && community) {
      try {
        setSaving(true);
        
        // Upload logo to Supabase Storage
        const fileName = `community-logos/${Date.now()}-${Math.random()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(fileName, {
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            name: 'logo.jpg'
          });

        if (uploadError) {
          console.error('Error uploading logo:', uploadError);
          Alert.alert('Error', 'Failed to upload logo');
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(fileName);

        // Update community with new logo
        const { error } = await supabase
          .from('community')
          .update({
            avatar_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', community.id);

        if (error) {
          console.error('Error updating community logo:', error);
          Alert.alert('Error', 'Failed to update logo');
          return;
        }

        // Refresh community info
        await fetchCommunityInfo();
        Alert.alert('Success', 'Logo updated successfully!');
      } catch (error) {
        console.error('Error updating logo:', error);
        Alert.alert('Error', 'Failed to update logo');
      } finally {
        setSaving(false);
      }
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const isMyMessage = (message: Message) => {
    return message.sender_id === currentUser?.id;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const myMessage = isMyMessage(item);
    const showAvatar = !myMessage && (index === 0 || messages[index - 1].sender_id !== item.sender_id);
    const showTime = index === messages.length - 1 || 
                    messages[index + 1].sender_id !== item.sender_id ||
                    (messages[index + 1].created_at - item.created_at) > 300000; // 5 minutes

    // Handle system messages
    if (item.message_type === 'system' || item.sender_id === 'system') {
      return (
        <View style={styles.systemMessageContainer}>
          <View style={styles.systemMessage}>
            <MaterialIcons name="celebration" size={16} color="#FF6B35" />
            <Text style={styles.systemMessageText}>{item.message}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[
        styles.messageContainer,
        myMessage ? styles.myMessage : styles.otherMessage
      ]}>
        {showAvatar && (
          <View style={styles.avatarContainer}>
            {item.sender_avatar ? (
              <Image source={{ uri: item.sender_avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.defaultAvatar, { backgroundColor: getAvatarColor(item.sender_name) }]}>
                <Text style={styles.avatarText}>{item.sender_name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            {!myMessage && (
              <View style={styles.onlineIndicator} />
            )}
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          myMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          !showAvatar && !myMessage && styles.messageWithoutAvatar
        ]}>
          {showAvatar && (
            <View style={styles.senderInfo}>
              <Text style={styles.senderName}>{item.sender_name}</Text>
              <Text style={styles.senderStatus}>🟢 Online</Text>
            </View>
          )}
          
                     {item.media_url ? (
             <View style={styles.imageContainer}>
               <Image source={{ uri: item.media_url }} style={styles.messageImage} />
               
               {/* Show upload status overlay */}
               {item.isUploading && (
                 <View style={styles.uploadOverlay}>
                   <ActivityIndicator size="small" color="#FFFFFF" />
                   <Text style={styles.uploadText}>Uploading...</Text>
                 </View>
               )}
               
               {/* Show upload failed overlay */}
               {item.uploadFailed && (
                 <View style={styles.uploadFailedOverlay}>
                   <MaterialIcons name="error" size={20} color="#FF4444" />
                   <Text style={styles.uploadFailedText}>Upload failed</Text>
                   <TouchableOpacity 
                     style={styles.retryButton}
                     onPress={() => retryImageUpload(item)}
                   >
                     <MaterialIcons name="refresh" size={16} color="#FFFFFF" />
                     <Text style={styles.retryText}>Retry</Text>
                   </TouchableOpacity>
                 </View>
               )}
               
               {item.message !== '📷 Shared an image' && item.message !== '📷 Uploading image...' && (
                 <Text style={[
                   styles.messageText,
                   myMessage ? styles.myMessageText : styles.otherMessageText
                 ]}>
                   {item.message}
                 </Text>
               )}
             </View>
           ) : (
            <Text style={[
              styles.messageText,
              myMessage ? styles.myMessageText : styles.otherMessageText
            ]}>
              {item.message}
            </Text>
          )}
          
          {showTime && (
            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTime,
                myMessage ? styles.myMessageTime : styles.otherMessageTime
              ]}>
                {formatTime(item.created_at)}
              </Text>
              {myMessage && (
                <MaterialIcons name="done-all" size={14} color="#4CAF50" style={styles.readIndicator} />
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Generate different colors for avatars to make it more vibrant
  const getAvatarColor = (name: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (!isActive) {
    return (
      <View style={styles.inactiveContainer}>
        <MaterialIcons name="chat-bubble-outline" size={48} color="#999" />
        <Text style={styles.inactiveText}>Chat is not available</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading community chat...</Text>
      </View>
    );
  }

  // Show message if user is not a member of any community
  if (!community) {
  return (
      <View style={styles.noCommunityContainer}>
        <MaterialIcons name="group-add" size={64} color="#2E7D32" />
        <Text style={styles.noCommunityTitle}>Join a Community</Text>
        <Text style={styles.noCommunityDescription}>
          You need to join a community to start chatting. Ask an admin for an invite code!
        </Text>
        
        {!showJoinInterface ? (
          <TouchableOpacity 
            style={styles.joinCommunityButton}
            activeOpacity={0.7}
            onPress={() => {
              console.log('🔘 Join Community button pressed - showing interface');
              setShowJoinInterface(true);
            }}
          >
            <MaterialIcons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.joinCommunityButtonText}>Join Community</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.joinInterfaceContainer}>
            <Text style={styles.joinInterfaceTitle}>Enter Invite Code</Text>
            <TextInput
              style={styles.joinInput}
              placeholder="Enter invite code (e.g., COO5LB)"
              placeholderTextColor="#999"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
            />
            <View style={styles.joinButtonRow}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowJoinInterface(false);
                  setInviteCode('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.joinButton, (!inviteCode.trim() || joining) && styles.disabledButton]}
                onPress={joinCommunity}
                disabled={!inviteCode.trim() || joining}
              >
                {joining ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialIcons name="group-add" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.joinButtonText}>
                  {joining ? 'Joining...' : 'Join'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

    return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.container}>
          {/* Enhanced Community Header */}
          <View style={styles.communityHeader}>
         <TouchableOpacity 
           style={styles.communityInfo}
           onPress={() => setShowEditModal(true)}
         >
           <View style={styles.communityLogoContainer}>
             {community?.avatar_url ? (
               <Image source={{ uri: community.avatar_url }} style={styles.communityLogo} />
             ) : (
               <View style={styles.defaultCommunityLogo}>
                 <MaterialIcons name="groups" size={24} color="#2E7D32" />
               </View>
             )}
           </View>
           <View style={styles.communityTextInfo}>
             <Text style={styles.communityName}>{community?.name || 'Cricket Community'}</Text>
             <View style={styles.memberInfo}>
               <Text style={styles.memberCount}>
                 👥 {memberCount} members {memberCount === 0 ? '(refreshing...)' : ''}
               </Text>
             </View>

           </View>
         </TouchableOpacity>
         
         <View style={styles.headerActions}>
           <TouchableOpacity 
             style={styles.inviteButton}
             onPress={() => setShowInviteModal(true)}
           >
             <MaterialIcons name="person-add" size={18} color="#2E7D32" />
             {console.log('🎯 Rendering invite button icon')}
           </TouchableOpacity>
           
           <TouchableOpacity 
             style={styles.headerJoinButton}
             onPress={() => setShowJoinModal(true)}
           >
             <MaterialIcons name="add" size={18} color="#2E7D32" />
             {console.log('🎯 Rendering join button icon')}
           </TouchableOpacity>
         </View>
       </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => `${item.id}-${item.created_at}-${item.sender_id}-${index}`}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      />
      
             <View style={styles.inputContainer}>
         <View style={styles.inputWrapper}>
           <TouchableOpacity onPress={pickImage} style={styles.cameraButton}>
             <MaterialIcons name="photo-camera" size={24} color="#666" />
           </TouchableOpacity>
           
           <TextInput
             style={styles.messageInput}
             placeholder="Message"
             placeholderTextColor="#999"
             value={newMessage}
             onChangeText={(text) => {
               setNewMessage(text);
               // Trigger typing indicator
               if (text.length > 0 && !isTyping) {
                 handleTyping(true);
               } else if (text.length === 0 && isTyping) {
                 handleTyping(false);
               }
             }}
             onFocus={() => {
               if (newMessage.length > 0) {
                 handleTyping(true);
               }
             }}
             onBlur={() => {
               handleTyping(false);
             }}
             multiline
             maxLength={500}
           />
           
           <TouchableOpacity
             style={[styles.sendButton, (!newMessage.trim() || sending) && styles.disabledSendButton]}
             onPress={sendMessage}
             disabled={!newMessage.trim() || sending}
           >
             <MaterialIcons 
               name={sending ? "hourglass-empty" : "send"} 
               size={20} 
               color={(!newMessage.trim() || sending) ? "#999" : "#FFFFFF"} 
             />
           </TouchableOpacity>
         </View>
         
         <View style={styles.typingIndicator}>
           {typingUsers.length > 0 && (
             <Text style={styles.typingText}>
               {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
             </Text>
           )}
         </View>
       </View>

             {/* Invite Modal */}
       <InviteModal 
         visible={showInviteModal}
         onClose={() => setShowInviteModal(false)}
       />

       {/* Join Group Modal */}
       <JoinGroupModal 
         visible={showJoinModal}
         onClose={() => setShowJoinModal(false)}
         onJoinSuccess={async () => {
           console.log('🎉 User joined successfully, refreshing data...');
           
           // Refresh community info and messages after joining
           await fetchCommunityInfo();
           await fetchMessages();
           
           // Explicitly refresh member count
           await refreshMemberCount();
           
           // Broadcast member count update to other users
           if (community?.id) {
             console.log('📡 Broadcasting member count update...');
             const channel = supabase.channel(`community_messages_${community.id}`);
             channel.send({
               type: 'broadcast',
               event: 'member_count',
               payload: { action: 'joined', user_id: currentUser?.id }
             });
           }
         }}
       />

      {/* Edit Community Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Community</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.editContent}>
              <TouchableOpacity onPress={pickCommunityLogo} style={styles.logoEditContainer}>
                {community?.avatar_url ? (
                  <Image source={{ uri: community.avatar_url }} style={styles.editLogo} />
                ) : (
                  <View style={styles.defaultEditLogo}>
                    <MaterialIcons name="group" size={32} color="#2E7D32" />
                  </View>
                )}
                <Text style={styles.logoEditText}>Tap to change logo</Text>
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Community Name</Text>
                <TextInput
                  style={styles.editInput}
                  value={editingName}
                  onChangeText={setEditingName}
                  placeholder="Enter community name"
                  maxLength={50}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.editInput, styles.textArea]}
                  value={editingDescription}
                  onChangeText={setEditingDescription}
                  placeholder="Enter community description"
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
              </View>

              <TouchableOpacity
                style={styles.viewMembersButton}
                onPress={() => {
                  setShowEditModal(false);
                  setShowMembersModal(true);
                }}
              >
                <MaterialIcons name="people" size={20} color="#2E7D32" />
                <Text style={styles.viewMembersButtonText}>View All Members</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={updateCommunityInfo}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Community Members List Modal */}
      <CommunityMembersList
        visible={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        communityId={community?.id || ''}
        onMemberPress={(member) => {
          // Navigate to user profile
          navigation.navigate('ProfileScreen' as never, { userId: member.user_id } as never);
        }}
      />
                </View>
        </KeyboardAvoidingView>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    marginTop: 0,
    paddingTop: 0,
  },
     communityHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     paddingHorizontal: 16,
     paddingVertical: 12,
     backgroundColor: '#FFFFFF',
     borderBottomWidth: 1,
     borderBottomColor: '#E0E0E0',
     elevation: 2,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.1,
     shadowRadius: 4,
     marginTop: 0,
   },
   communityInfo: {
     flex: 1,
     flexDirection: 'row',
     alignItems: 'center',
   },
   communityLogoContainer: {
     marginRight: 12,
     position: 'relative',
   },
   communityLogo: {
     width: 48,
     height: 48,
     borderRadius: 24,
   },
   defaultCommunityLogo: {
     width: 48,
     height: 48,
     borderRadius: 24,
     backgroundColor: '#E8F5E8',
     justifyContent: 'center',
     alignItems: 'center',
     borderWidth: 2,
     borderColor: '#2E7D32',
   },

   communityTextInfo: {
     flex: 1,
   },
   communityName: {
     fontSize: 20,
     fontWeight: 'bold',
     color: '#2E7D32',
     marginBottom: 4,
   },
   memberInfo: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 12,
   },
     memberCount: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  debugInfo: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },

       headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    joinButton: {
      width: 36,
      height: 36,
      backgroundColor: '#E8F5E8',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#2E7D32',
      justifyContent: 'center',
      alignItems: 'center',
    },
   inviteButton: {
     width: 36,
     height: 36,
     backgroundColor: '#E8F5E8',
     borderRadius: 18,
     borderWidth: 1,
     borderColor: '#2E7D32',
     justifyContent: 'center',
     alignItems: 'center',
   },
   headerJoinButton: {
     width: 36,
     height: 36,
     backgroundColor: '#E8F5E8',
     borderRadius: 18,
     borderWidth: 1,
     borderColor: '#2E7D32',
     justifyContent: 'center',
     alignItems: 'center',
   },
   inviteButtonText: {
     fontSize: 12,
     color: '#2E7D32',
     marginLeft: 4,
     fontWeight: '600',
   },
   refreshButton: {
     width: 36,
     height: 36,
     backgroundColor: '#FF6B35',
     borderRadius: 18,
     borderWidth: 1,
     borderColor: '#FF6B35',
     justifyContent: 'center',
     alignItems: 'center',
   },
  inactiveContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  inactiveText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
     avatarContainer: {
     marginRight: 8,
     alignItems: 'center',
     position: 'relative',
   },
   avatar: {
     width: 40,
     height: 40,
     borderRadius: 20,
     borderWidth: 2,
     borderColor: '#FFFFFF',
   },
   defaultAvatar: {
     width: 40,
     height: 40,
     borderRadius: 20,
     justifyContent: 'center',
     alignItems: 'center',
     borderWidth: 2,
     borderColor: '#FFFFFF',
   },
   avatarText: {
     fontSize: 16,
     fontWeight: 'bold',
     color: '#fff',
   },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: '#2E7D32',
    borderBottomRightRadius: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  messageWithoutAvatar: {
    marginLeft: 44,
  },
     senderInfo: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     marginBottom: 4,
   },
   senderName: {
     fontSize: 13,
     fontWeight: '600',
     color: '#495057',
   },
   senderStatus: {
     fontSize: 11,
     color: '#4CAF50',
     fontWeight: '500',
   },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#2c3e50',
  },
     messageFooter: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'flex-end',
     marginTop: 4,
     gap: 4,
   },
   messageTime: {
     fontSize: 11,
   },
   myMessageTime: {
     color: 'rgba(255, 255, 255, 0.7)',
   },
   otherMessageTime: {
     color: '#6c757d',
   },
   readIndicator: {
     marginLeft: 2,
   },
  imageContainer: {
    marginBottom: 4,
  },
     messageImage: {
     width: 200,
     height: 150,
     borderRadius: 12,
     marginBottom: 8,
   },
   uploadOverlay: {
     position: 'absolute',
     top: 0,
     left: 0,
     right: 0,
     bottom: 0,
     backgroundColor: 'rgba(0, 0, 0, 0.6)',
     borderRadius: 12,
     justifyContent: 'center',
     alignItems: 'center',
     flexDirection: 'row',
     gap: 8,
   },
   uploadText: {
     color: '#FFFFFF',
     fontSize: 14,
     fontWeight: '600',
   },
   uploadFailedOverlay: {
     position: 'absolute',
     top: 0,
     left: 0,
     right: 0,
     bottom: 0,
     backgroundColor: 'rgba(255, 68, 68, 0.9)',
     borderRadius: 12,
     justifyContent: 'center',
     alignItems: 'center',
     flexDirection: 'column',
     gap: 8,
   },
   uploadFailedText: {
     color: '#FFFFFF',
     fontSize: 14,
     fontWeight: '600',
   },
   retryButton: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: 'rgba(255, 255, 255, 0.2)',
     paddingHorizontal: 12,
     paddingVertical: 6,
     borderRadius: 16,
     marginTop: 8,
     gap: 4,
   },
   retryText: {
     color: '#FFFFFF',
     fontSize: 12,
     fontWeight: '600',
   },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
     systemMessage: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#FFF3E0',
     paddingHorizontal: 16,
     paddingVertical: 8,
     borderRadius: 20,
     borderWidth: 1,
     borderColor: '#FF6B35',
     elevation: 1,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.1,
     shadowRadius: 2,
   },
   systemMessageText: {
     fontSize: 13,
     color: '#FF6B35',
     marginLeft: 6,
     textAlign: 'center',
     fontWeight: '500',
   },
     inputContainer: {
     paddingHorizontal: 16,
     paddingVertical: 12,
     backgroundColor: '#FFFFFF',
     borderTopWidth: 1,
     borderTopColor: '#E0E0E0',
     elevation: 4,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: -2 },
     shadowOpacity: 0.1,
     shadowRadius: 4,
   },
   inputActions: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 8,
     gap: 8,
   },
   cameraButton: {
     padding: 8,
     backgroundColor: 'transparent',
     borderRadius: 20,
     justifyContent: 'center',
     alignItems: 'center',
   },
   inputWrapper: {
     flexDirection: 'row',
     alignItems: 'flex-end',
     gap: 12,
   },
   messageInput: {
     flex: 1,
     borderWidth: 1,
     borderColor: '#E0E0E0',
     borderRadius: 20,
     paddingHorizontal: 16,
     paddingVertical: 10,
     fontSize: 16,
     maxHeight: 100,
     minHeight: 40,
     backgroundColor: '#F8F9FA',
     textAlignVertical: 'center',
   },
   sendButton: {
     width: 40,
     height: 40,
     borderRadius: 20,
     backgroundColor: '#2E7D32',
     justifyContent: 'center',
     alignItems: 'center',
     elevation: 2,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.2,
     shadowRadius: 2,
   },
   disabledSendButton: {
     backgroundColor: '#E0E0E0',
     elevation: 0,
     shadowOpacity: 0,
   },
   typingIndicator: {
     marginTop: 8,
     alignItems: 'center',
   },
   typingText: {
     fontSize: 12,
     color: '#666',
     fontStyle: 'italic',
   },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  closeButton: {
    padding: 4,
  },
  editContent: {
    alignItems: 'center',
  },
  logoEditContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  editLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  defaultEditLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoEditText: {
    fontSize: 12,
    color: '#666',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  viewMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E7D32',
    marginTop: 16,
    marginBottom: 8,
  },
  viewMembersButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noCommunityContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 32,
  },
  noCommunityTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  noCommunityDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  joinCommunityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  joinCommunityButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  joinInterfaceContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  joinInterfaceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 16,
    textAlign: 'center',
  },
  joinInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  joinButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  joinButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
}); 