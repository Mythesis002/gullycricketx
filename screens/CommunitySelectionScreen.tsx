import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../utils/supabaseClient';

interface Community {
  id: string;
  name: string;
  description: string;
  logo_url?: string;
  created_by: string;
  member_count?: number;
}

export default function CommunitySelectionScreen({ navigation }: any) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');
  const [newCommunityLogo, setNewCommunityLogo] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchUserCommunities();
  }, []);

  const fetchUserCommunities = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        setCommunities([]);
        return;
      }

      // Fetch communities where user is a member
      const { data: userCommunities, error } = await supabase
        .from('community_members')
        .select(`
          community_id,
          community:community(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching user communities:', error);
        setCommunities([]);
        return;
      }

      // Transform the data to match our Community interface
      const userCommunitiesList = (userCommunities || []).map(item => ({
        id: item.community.id,
        name: item.community.name,
        description: item.community.description || 'A cricket community',
        logo_url: item.community.avatar_url,
        created_by: item.community.created_by,
        member_count: item.community.member_count || 0
      }));

      setCommunities(userCommunitiesList);
    } catch (error) {
      console.error('Error fetching communities:', error);
      setCommunities([]);
    } finally {
      setLoading(false);
    }
  };

  const pickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setNewCommunityLogo(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const createNewCommunity = async () => {
    if (!newCommunityName.trim()) {
      Alert.alert('Error', 'Community name is required');
      return;
    }

    setCreating(true);
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        Alert.alert('Error', 'Please log in to create communities');
        return;
      }

      // Generate a unique invite code (6 characters, alphanumeric)
      const generateInviteCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      let inviteCode = generateInviteCode();
      
      // Check if invite code already exists (retry if needed)
      let attempts = 0;
      while (attempts < 5) {
        const { data: existingCommunity } = await supabase
          .from('community')
          .select('id')
          .eq('invite_code', inviteCode)
          .single();
        
        if (!existingCommunity) break;
        inviteCode = generateInviteCode();
        attempts++;
      }

      // Create the community
      const { data: newCommunity, error: createError } = await supabase
        .from('community')
        .insert({
          name: newCommunityName.trim(),
          description: newCommunityDescription.trim() || 'A cricket community for passionate players',
          avatar_url: newCommunityLogo,
          created_by: userId,
          invite_code: inviteCode,
          member_count: 1
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating community:', createError);
        Alert.alert('Error', 'Failed to create community. Please try again.');
        return;
      }

      // Add the creator as the first member
      const { error: memberError } = await supabase
        .from('community_members')
        .insert({
          user_id: userId,
          user_name: 'Community Creator', // Will be updated with actual user name
          user_avatar: newCommunityLogo,
          community_id: newCommunity.id,
          joined_at: new Date().toISOString(),
          is_active: true
        });

      if (memberError) {
        console.error('Error adding creator as member:', memberError);
        // Community was created but member addition failed
        Alert.alert('Warning', 'Community created but there was an issue adding you as a member.');
      }

      // Reset form
      setNewCommunityName('');
      setNewCommunityDescription('');
      setNewCommunityLogo('');
      setShowCreateModal(false);
      
      Alert.alert(
        'Success! 🎉', 
        `Community "${newCommunity.name}" created successfully!\n\nInvite Code: ${inviteCode}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Refresh communities and navigate to the new community
              fetchUserCommunities();
              navigation.navigate('Chat', { communityId: newCommunity.id, community: newCommunity });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating community:', error);
      Alert.alert('Error', 'Failed to create community. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const joinCommunity = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    try {
      setJoining(true);
      
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

      // Check if invite code is expired (optional - you can add expiry logic)
      // For now, we'll just check if the community exists

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
        setShowJoinModal(false);
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
              setShowJoinModal(false);
              // Refresh user communities and navigate to chat
              fetchUserCommunities();
              navigation.navigate('Chat', { communityId: community.id, community });
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

  const generateInviteLink = (communityId: string) => {
    const inviteLink = `gullycricketx://community/${communityId}`;
    Alert.alert(
      'Invite Link',
      `Share this link with others:\n\n${inviteLink}`,
      [
        { text: 'Copy', onPress: () => console.log('Copy to clipboard') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderCommunityCard = (community: Community) => (
    <TouchableOpacity
      key={community.id}
      style={styles.communityCard}
      onPress={() => navigation.navigate('Chat', { communityId: community.id, community })}
    >
      <View style={styles.cardHeader}>
        {community.logo_url ? (
          <Image source={{ uri: community.logo_url }} style={styles.communityLogo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <MaterialIcons name="sports-cricket" size={24} color="#4CAF50" />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.communityName}>{community.name}</Text>
          <Text style={styles.communityDescription}>{community.description}</Text>
          <Text style={styles.memberCount}>{community.member_count} members</Text>
        </View>
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => generateInviteLink(community.id)}
        >
          <MaterialIcons name="share" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cricket Communities</Text>
        <Text style={styles.headerSubtitle}>Join or create cricket communities</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowCreateModal(true)}
          >
            <MaterialIcons name="add-circle" size={32} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Create Community</Text>
            <Text style={styles.actionButtonSubtext}>Start a new cricket community</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => {
              console.log('🔘 Join Community button pressed - navigating to chat');
              // Navigate directly to chat where user can join community
              navigation.navigate('Chat');
            }}
          >
            <MaterialIcons name="group-add" size={32} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Join Community</Text>
            <Text style={styles.actionButtonSubtext}>Join via invite link</Text>
          </TouchableOpacity>
        </View>

        {/* Your Communities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Communities</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <MaterialIcons name="sports-cricket" size={40} color="#4CAF50" />
              <Text style={styles.loadingText}>Loading communities...</Text>
            </View>
          ) : communities.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="group" size={60} color="#ccc" />
              <Text style={styles.emptyTitle}>No Communities Yet</Text>
              <Text style={styles.emptySubtitle}>
                Create your first cricket community or join one via invite link
              </Text>
            </View>
          ) : (
            communities.map(renderCommunityCard)
          )}
        </View>
      </ScrollView>

      {/* Create Community Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create New Community</Text>
            <TouchableOpacity
              onPress={createNewCommunity}
              disabled={creating}
              style={[styles.saveButton, creating && styles.saveButtonDisabled]}
            >
              <Text style={styles.saveButtonText}>{creating ? 'Creating...' : 'Create'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Community Logo */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Community Logo</Text>
              <TouchableOpacity style={styles.logoContainer} onPress={pickLogo}>
                {newCommunityLogo ? (
                  <Image source={{ uri: newCommunityLogo }} style={styles.logoImage} />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <MaterialIcons name="add-a-photo" size={32} color="#666" />
                    <Text style={styles.logoPlaceholderText}>Add Logo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Community Name */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Community Name *</Text>
              <TextInput
                style={styles.textInput}
                value={newCommunityName}
                onChangeText={setNewCommunityName}
                placeholder="Enter community name..."
                placeholderTextColor="#999"
                maxLength={50}
              />
            </View>

            {/* Community Description */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newCommunityDescription}
                onChangeText={setNewCommunityDescription}
                placeholder="Describe your community..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                maxLength={200}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Join Community Modal */}
      <Modal
        visible={showJoinModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          console.log('🔘 Modal onRequestClose triggered');
          setShowJoinModal(false);
        }}
      >
        {console.log('🎭 Rendering Join Modal, visible:', showJoinModal)}
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowJoinModal(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Join Community</Text>
            <TouchableOpacity
              onPress={joinCommunity}
              disabled={joining}
              style={[styles.saveButton, joining && styles.saveButtonDisabled]}
            >
              <Text style={styles.saveButtonText}>{joining ? 'Joining...' : 'Join'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Invite Code or Link</Text>
              <TextInput
                style={styles.textInput}
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="Enter invite code or paste link..."
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
              <Text style={styles.helperText}>
                Enter the invite code or paste the invite link shared with you
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2E7D32',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e0e0',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  actionButtons: {
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  communityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  communityLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  logoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  communityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 12,
    color: '#999',
  },
  inviteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    marginBottom: 25,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  logoPlaceholderText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
}); 