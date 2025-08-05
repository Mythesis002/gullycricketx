import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../utils/supabaseClient';

interface CommunityMember {
  id: string;
  user_id: string;
  name: string;
  profile_picture?: string;
  jersey_number?: string;
  joined_at: string;
  isOnline?: boolean;
}

interface CommunityMembersListProps {
  visible: boolean;
  onClose: () => void;
  communityId: string;
  onMemberPress?: (member: CommunityMember) => void;
}

export default function CommunityMembersList({ 
  visible, 
  onClose, 
  communityId,
  onMemberPress 
}: CommunityMembersListProps) {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && communityId) {
      fetchMembers();
    }
  }, [visible, communityId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching members for community:', communityId);
      
      // First, get all community members
      const { data: membersData, error: membersError } = await supabase
        .from('community_members')
        .select(`
          id,
          user_id,
          joined_at
        `)
        .eq('community_id', communityId)
        .order('joined_at', { ascending: true });

      if (membersError) {
        console.error('❌ Error fetching community members:', membersError);
        return;
      }

      console.log('📋 Found community members:', membersData);

      if (!membersData || membersData.length === 0) {
        console.log('📭 No community members found');
        setMembers([]);
        return;
      }

      // Extract user IDs
      const userIds = membersData.map((member: any) => member.user_id);
      console.log('👥 User IDs to fetch:', userIds);

      // Fetch user details one by one to handle type mismatches
      const formattedMembers: CommunityMember[] = [];
      
      for (const member of membersData) {
        console.log(`🔍 Fetching user details for: ${member.user_id}`);
        
        // Try to fetch user data with explicit type handling
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, profilePicture, jerseyNumber')
          .eq('id', member.user_id)
          .maybeSingle();

        if (userError) {
          console.error(`❌ Error fetching user ${member.user_id}:`, userError);
          // Add a fallback member entry
          formattedMembers.push({
            id: member.id,
            user_id: member.user_id,
            name: `Member ${member.user_id.slice(0, 8)}`,
            profile_picture: undefined,
            jersey_number: undefined,
            joined_at: member.joined_at,
            isOnline: Math.random() > 0.7,
          });
        } else {
          console.log(`✅ User data for ${member.user_id}:`, userData);
          formattedMembers.push({
            id: member.id,
            user_id: member.user_id,
            name: userData?.name || `Member ${member.user_id.slice(0, 8)}`,
            profile_picture: userData?.profilePicture,
            jersey_number: userData?.jerseyNumber,
            joined_at: member.joined_at,
            isOnline: Math.random() > 0.7,
          });
        }
      }

      console.log('✅ Final formatted members:', formattedMembers);
      setMembers(formattedMembers);
    } catch (error) {
      console.error('❌ Error in fetchMembers:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMember = ({ item }: { item: CommunityMember }) => (
    <TouchableOpacity
      style={styles.memberItem}
      onPress={() => onMemberPress?.(item)}
    >
      <View style={styles.memberAvatarContainer}>
        {item.profile_picture ? (
          <Image source={{ uri: item.profile_picture }} style={styles.memberAvatar} />
        ) : (
          <View style={[styles.defaultAvatar, { backgroundColor: getAvatarColor(item.name) }]}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {item.isOnline && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <View style={styles.memberDetails}>
          <Text style={styles.memberStatus}>
            {item.isOnline ? '🟢 Online' : '⚪ Offline'}
          </Text>
          {item.jersey_number && (
            <Text style={styles.jerseyNumber}>
              #{item.jersey_number}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.memberActions}>
        <Text style={styles.joinedDate}>
          Joined {formatDate(item.joined_at)}
        </Text>
        <MaterialIcons name="chevron-right" size={20} color="#999" />
      </View>
    </TouchableOpacity>
  );

  const getAvatarColor = (name: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'today';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

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
            <Text style={styles.modalTitle}>Community Members</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          


          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <Text style={styles.loadingText}>Loading members...</Text>
            </View>
          ) : (
            <>
              <View style={styles.memberCountHeader}>
                <Text style={styles.memberCountText}>
                  👥 {members.length} members
                </Text>
              </View>

              <FlatList
                data={members}
                renderItem={renderMember}
                keyExtractor={(item) => item.id}
                style={styles.membersList}
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
                initialNumToRender={10}
                onEndReachedThreshold={0.1}


                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="people-outline" size={48} color="#999" />
                    <Text style={styles.emptyText}>No members found</Text>
                  </View>
                }
              />
            </>
          )}
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
    maxHeight: '80%',
    minHeight: 300, // Ensure minimum height
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  memberCountHeader: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  memberCountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
    textAlign: 'center',
  },
  debugText: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  debugContainer: {
    paddingVertical: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 12,
  },
  membersList: {
    flex: 1,
    minHeight: 200, // Ensure minimum height for the list
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
    marginVertical: 2,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  memberAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#E8F5E8',
  },
  defaultAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8F5E8',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
    marginRight: 12,
  },
  memberName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 4,
  },
  memberStatus: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  memberDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  jerseyNumber: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '700',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  memberActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  joinedDate: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
}); 