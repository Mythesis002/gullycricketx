import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../utils/supabaseClient';

interface Community {
  id: string;
  name: string;
  description: string;
  logo_url?: string;
  created_by: string;
  member_count?: number;
}

export default function CommunityInviteScreen({ route, navigation }: any) {
  const { communityId, inviteCode } = route.params || {};
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchCommunityDetails();
  }, [communityId, inviteCode]);

  const fetchCommunityDetails = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual database query
      const mockCommunity: Community = {
        id: communityId || 'invited-community',
        name: 'Kallu Cricket Council',
        description: 'The official cricket community for Kallu Cricket Council. Share match moments, discuss strategies, and connect with fellow players!',
        logo_url: undefined,
        created_by: 'adarsh',
        member_count: 4
      };

      setCommunity(mockCommunity);
    } catch (error) {
      console.error('Error fetching community details:', error);
      Alert.alert('Error', 'Failed to load community details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCommunity = async () => {
    setJoining(true);
    try {
      // Mock joining - replace with actual database logic
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      Alert.alert(
        'Welcome! 🏏',
        'You have successfully joined the community!',
        [
          {
            text: 'Go to Chat',
            onPress: () => {
              navigation.replace('Chat', { communityId: community?.id, community });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error joining community:', error);
      Alert.alert('Error', 'Failed to join community');
    } finally {
      setJoining(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Invitation',
      'Are you sure you want to decline this invitation?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            navigation.goBack();
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="sports-cricket" size={60} color="#4CAF50" />
          <Text style={styles.loadingText}>Loading community details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!community) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={60} color="#F44336" />
          <Text style={styles.errorTitle}>Invalid Invitation</Text>
          <Text style={styles.errorSubtitle}>
            This invitation link is invalid or has expired.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community Invitation</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Community Info Card */}
        <View style={styles.communityCard}>
          <View style={styles.communityHeader}>
            {community.logo_url ? (
              <Image source={{ uri: community.logo_url }} style={styles.communityLogo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <MaterialIcons name="sports-cricket" size={40} color="#4CAF50" />
              </View>
            )}
            <View style={styles.communityInfo}>
              <Text style={styles.communityName}>{community.name}</Text>
              <Text style={styles.memberCount}>{community.member_count} members</Text>
            </View>
          </View>
          
          <Text style={styles.communityDescription}>{community.description}</Text>
        </View>

        {/* Invitation Message */}
        <View style={styles.invitationCard}>
          <MaterialIcons name="email" size={32} color="#4CAF50" />
          <Text style={styles.invitationTitle}>You're Invited! 🏏</Text>
          <Text style={styles.invitationMessage}>
            You've been invited to join the {community.name} community. 
            Join to connect with fellow cricket enthusiasts, share match moments, 
            and discuss strategies!
          </Text>
        </View>

        {/* Community Features */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>What you'll get:</Text>
          <View style={styles.featureItem}>
            <MaterialIcons name="chat" size={20} color="#4CAF50" />
            <Text style={styles.featureText}>Real-time community chat</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="group" size={20} color="#4CAF50" />
            <Text style={styles.featureText}>Connect with cricket players</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="sports-cricket" size={20} color="#4CAF50" />
            <Text style={styles.featureText}>Share match moments</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="notifications" size={20} color="#4CAF50" />
            <Text style={styles.featureText}>Get community updates</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.primaryButton, joining && styles.primaryButtonDisabled]}
            onPress={handleJoinCommunity}
            disabled={joining}
          >
            <MaterialIcons name="check" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>
              {joining ? 'Joining...' : 'Yes, Join Community'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleDecline}
          >
            <MaterialIcons name="close" size={20} color="#666" />
            <Text style={styles.secondaryButtonText}>No, Thanks</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  communityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  communityLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    color: '#666',
  },
  communityDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  invitationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  invitationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 10,
  },
  invitationMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  featuresCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  actionButtons: {
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: '#ccc',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
}); 