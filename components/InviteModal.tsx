import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../utils/supabaseClient';

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function InviteModal({ visible, onClose }: InviteModalProps) {
  const [inviteCode, setInviteCode] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generateInviteCode = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }
      
      // Get the community that the user is a member of
      const { data: userCommunity, error: communityError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id)
        .single();
      
      if (communityError || !userCommunity) {
        console.error('Error fetching user community:', communityError);
        Alert.alert('Error', 'Could not find your community');
        return;
      }
      
      // Generate a random 6-character code
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Set expiry to 10 minutes from now
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      
      // Update the specific community with new invite code
      const { data: community, error } = await supabase
        .from('community')
        .update({
          invite_code: code,
          invite_code_expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', userCommunity.community_id)
        .select('invite_code')
        .single();

      if (error) {
        console.error('Error generating invite code:', error);
        Alert.alert('Error', 'Failed to generate invite code');
        return;
      }

      setInviteCode(community.invite_code);
      console.log('✅ Generated new invite code:', code, 'expires at:', expiresAt);
    } catch (error) {
      console.error('Error generating invite code:', error);
      Alert.alert('Error', 'Failed to generate invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!inviteCode) {
      await generateInviteCode();
      return;
    }

    const inviteLink = `https://gullycricketx.com/join/${inviteCode}`;
    const message = `Join me on GullyCricketX! 🏏 Click here to join our cricket community: ${inviteLink}`;

    try {
      await Share.share({
        message,
        title: 'Join GullyCricketX Community',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share invite link');
    }
  };

  const handleCopyLink = async () => {
    if (!inviteCode) {
      await generateInviteCode();
      return;
    }

    const inviteLink = `https://gullycricketx.com/join/${inviteCode}`;
    
    // For now, just show the link in an alert
    // In a real app, you'd use a clipboard library
    Alert.alert(
      'Invite Link',
      `Copy this link to share with friends:\n\n${inviteLink}`,
      [
        { text: 'OK', onPress: () => {} },
        { text: 'Share', onPress: handleShare }
      ]
    );
  };

  React.useEffect(() => {
    if (visible) {
      generateInviteCode();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🔗 Invite Friends</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.description}>
              Share this link with friends to invite them to the community:
            </Text>

            <View style={styles.inviteCodeContainer}>
              <Text style={styles.inviteCodeLabel}>Invite Code:</Text>
              <Text style={styles.inviteCode}>
                {loading ? 'Generating...' : inviteCode || 'Click Generate'}
              </Text>
            </View>

            <View style={styles.linkContainer}>
              <Text style={styles.linkLabel}>Share this code with friends:</Text>
              <Text style={styles.linkText}>
                {loading ? 'Generating...' : inviteCode || 'Code will appear here'}
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyLink}
                disabled={loading}
              >
                <MaterialIcons name="content-copy" size={20} color="#2E7D32" />
                <Text style={styles.copyButtonText}>Copy Code</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShare}
                disabled={loading}
              >
                <MaterialIcons name="share" size={20} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.note}>
              ⏰ This code expires in 10 minutes for security
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
  inviteCodeContainer: {
    width: '100%',
    marginBottom: 16,
  },
  inviteCodeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  inviteCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
  },
  linkContainer: {
    width: '100%',
    marginBottom: 24,
  },
  linkLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#2E7D32',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E8',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  copyButtonText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
    marginLeft: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  shareButtonText: {
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