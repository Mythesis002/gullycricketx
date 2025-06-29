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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';

interface Message {
  id: string;
  userId: string;
  userName: string;
  jerseyNumber: string;
  message: string;
  imageUrl?: string;
  createdAt: number;
  matchId: string;
}

interface MatchChatProps {
  matchId: string;
  isActive: boolean;
}

export default function MatchChat({ matchId, isActive }: MatchChatProps) {
  const { db, user } = useBasic();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (isActive) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }
  }, [matchId, isActive]);

  const fetchMessages = async () => {
    try {
      const allMessages = await db?.from('chatMessages').getAll();
      if (allMessages) {
        const matchMessages = (allMessages as any[])
          .filter(msg => msg.matchId === matchId)
          .sort((a, b) => a.createdAt - b.createdAt);
        setMessages(matchMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const messageData = {
        userId: user?.id || '',
        userName: user?.name || 'Unknown Player',
        jerseyNumber: '00', // This should come from user profile
        message: newMessage.trim(),
        imageUrl: '',
        createdAt: Date.now(),
        matchId: matchId,
      };

      await db?.from('chatMessages').add(messageData);
      setNewMessage('');
      fetchMessages();
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.userId === user?.id;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        {!isMyMessage && (
          <View style={styles.messageHeader}>
            <Text style={styles.senderName}>{item.userName}</Text>
            <Text style={styles.jerseyNumber}>#{item.jerseyNumber}</Text>
          </View>
        )}
        <Text style={[
          styles.messageText,
          isMyMessage ? styles.myMessageText : styles.otherMessageText
        ]}>
          {item.message}
        </Text>
        <Text style={[
          styles.messageTime,
          isMyMessage ? styles.myMessageTime : styles.otherMessageTime
        ]}>
          {formatTime(item.createdAt)}
        </Text>
      </View>
    );
  };

  if (!isActive) {
    return (
      <View style={styles.inactiveContainer}>
        <MaterialIcons name="chat-bubble-outline" size={48} color="#999" />
        <Text style={styles.inactiveText}>Match chat is not active</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={newMessage}
          onChangeText={setNewMessage}
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
            size={24} 
            color={(!newMessage.trim() || sending) ? "#999" : "#FFD700"} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  jerseyNumber: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
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
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendButton: {
    backgroundColor: '#E0E0E0',
  },
});