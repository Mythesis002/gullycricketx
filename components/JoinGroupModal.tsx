import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../utils/supabaseClient';

interface JoinGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onJoinSuccess: () => void;
}

export default function JoinGroupModal({ visible, onClose, onJoinSuccess }: JoinGroupModalProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    setJoining(true);
    try {
      // First, find the community with this invite code
      const { data: community, error: communityError } = await supabase
        .from('community')
        .select('*')
        .eq('invite_code', inviteCode.trim())
        .single();

      if (communityError || !community) {
        Alert.alert('Error', 'Invalid invite code. Please check and try again.');
        return;
      }

      // Check if invite code is still valid (not expired)
      const now = Date.now();
      const codeExpiry = community.invite_code_expires_at;
      
      if (codeExpiry && now > new Date(codeExpiry).getTime()) {
        Alert.alert('Error', 'This invite code has expired. Please ask for a new one.');
        return;
      }

      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        Alert.alert('Error', 'Please log in to join groups');
        return;
      }

      // Get user profile
      const { data: userProfile } = await supabase
        .from('users')
        .select('name, "profilePicture"')
        .eq('id', userId)
        .single();

      // Join the community
      const { error: joinError } = await supabase
        .from('community_members')
        .upsert({
          user_id: userId,
          user_name: userProfile?.name || 'Anonymous',
          user_avatar: userProfile?.profilePicture,
          community_id: community.id,
          joined_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,community_id'
        });

      if (joinError) {
        console.error('Error joining community:', joinError);
        Alert.alert('Error', 'Failed to join group. Please try again.');
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
              onJoinSuccess();
              onClose();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Error', 'Failed to join group. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    onClose();
  };

  console.log('🎭 JoinGroupModal render - visible:', visible);
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
      onShow={() => console.log('🎭 JoinGroupModal onShow triggered')}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>➕ Join Group</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.description}>
              Enter the invite code to join a group:
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter invite code..."
                placeholderTextColor="#999"
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={10}
              />
            </View>

            <TouchableOpacity
              style={[styles.joinButton, (!inviteCode.trim() || joining) && styles.disabledButton]}
              onPress={handleJoinGroup}
              disabled={!inviteCode.trim() || joining}
            >
              {joining ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="group-add" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.joinButtonText}>
                {joining ? 'Joining...' : 'Join Group'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              💡 Invite codes expire in 10 minutes for security
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black background
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
  content: {
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 2,
    backgroundColor: '#F8F9FA',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  joinButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
}); 