import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';
import { useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

interface ChatMessage {
  id: string;
  matchId: string;
  userId: string;
  userName: string;
  jerseyNumber: string;
  message: string;
  imageUrl?: string;
  createdAt: number;
}

export default function ChatScreen() {
  const { db, user } = useBasic();
  const route = useRoute();
  const { matchId } = route.params as { matchId: string };
  const flatListRef = useRef<FlatList>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMessages();
    // Set up polling for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchMessages = async () => {
    try {
      const allMessages = await db?.from('chatMessages').getAll();
      if (allMessages) {
        const matchMessages = (allMessages as any[])
          .filter(msg => msg.matchId === matchId)
          .sort((a, b) => a.createdAt - b.createdAt);
        setMessages(matchMessages);
        
        // Scroll to bottom when new messages arrive
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) {
      return;
    }

    setSending(true);

    try {
      // Get current user profile for jersey number
      const users = await db?.from('users').getAll();
      const currentUser = users?.find(u => u.email === user?.email);

      const messageData = {
        matchId: matchId,
        userId: user?.id || '',
        userName: currentUser?.name || user?.name || 'Unknown Player',
        jerseyNumber: currentUser?.jerseyNumber || '00',
        message: newMessage.trim(),
        imageUrl: '',
        createdAt: Date.now(),
      };

      await db?.from('chatMessages').add(messageData);
      setNewMessage('');
      fetchMessages(); // Refresh messages
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const pickImage = async () => {
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
    setSending(true);

    try {
      const users = await db?.from('users').getAll();
      const currentUser = users?.find(u => u.email === user?.email);

      const messageData = {
        matchId: matchId,
        userId: user?.id || '',
        userName: currentUser?.name || user?.name || 'Unknown Player',
        jerseyNumber: currentUser?.jerseyNumber || '00',
        message: '📷 Shared an image',
        imageUrl: imageUri,
        createdAt: Date.now(),
      };

      await db?.from('chatMessages').add(messageData);
      fetchMessages();
    } catch (error) {
      console.error('Error sending image:', error);
      Alert.alert('Error', 'Failed to send image');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMyMessage = item.userId === user?.id;
    const showAvatar = index === 0 || messages[index - 1].userId !== item.userId;
    const showTime = index === messages.length - 1 || 
                    messages[index + 1].userId !== item.userId ||
                    (messages[index + 1].createdAt - item.createdAt) > 300000; // 5 minutes

    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        {!isMyMessage && showAvatar && (
          <View style={styles.avatarContainer}>
            <MaterialIcons name="person" size={20} color="#1B5E20" />
            <Text style={styles.jerseyText}>#{item.jerseyNumber}</Text>
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          !isMyMessage && !showAvatar && styles.messageWithoutAvatar
        ]}>
          {!isMyMessage && showAvatar && (
            <Text style={styles.senderName}>{item.userName}</Text>
          )}
          
          {item.imageUrl ? (
            <View>
              <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
              {item.message !== '📷 Shared an image' && (
                <Text style={[
                  styles.messageText,
                  isMyMessage ? styles.myMessageText : styles.otherMessageText
                ]}>
                  {item.message}
                </Text>
              )}
            </View>
          ) : (
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText
            ]}>
              {item.message}
            </Text>
          )}
          
          {showTime && (
            <Text style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.otherMessageTime
            ]}>
              {formatTime(item.createdAt)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="chat" size={80} color="#FFD700" />
      <Text style={styles.emptyTitle}>Start the Conversation!</Text>
      <Text style={styles.emptySubtitle}>
        Share match updates, celebrate great plays, and connect with your team!
      </Text>
      <View style={styles.chatTips}>
        <Text style={styles.tipsTitle}>💬 Chat Features:</Text>
        <Text style={styles.tipText}>• Share match moments and celebrations</Text>
        <Text style={styles.tipText}>• Upload action shots and memes</Text>
        <Text style={styles.tipText}>• Coordinate team strategies</Text>
        <Text style={styles.tipText}>• Keep the cricket spirit alive!</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="chat" size={60} color="#FFD700" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          style={styles.messagesList}
          contentContainerStyle={messages.length === 0 ? styles.emptyContainer : styles.messagesContainer}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <MaterialIcons name="photo-camera" size={24} color="#FFD700" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton,
              { opacity: (!newMessage.trim() || sending) ? 0.5 : 1 }
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            <MaterialIcons 
              name={sending ? "hourglass-empty" : "send"} 
              size={24} 
              color="#1B5E20" 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#2E7D32',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  chatTips: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    width: '100%',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  messageContainer: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  jerseyText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1B5E20',
    position: 'absolute',
    bottom: -2,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myMessageBubble: {
    backgroundColor: '#2E7D32',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageWithoutAvatar: {
    marginLeft: 40,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#333',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  myMessageTime: {
    color: '#E8F5E8',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 2,
    borderTopColor: '#4CAF50',
  },
  imageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
