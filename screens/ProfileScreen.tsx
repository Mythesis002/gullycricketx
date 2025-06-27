import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';
import { useNavigation } from '@react-navigation/native';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  jerseyNumber: string;
  bio: string;
  matchesPlayed: number;
  totalRuns: number;
  totalWickets: number;
  battingAverage: number;
  strikeRate: number;
  bowlingAverage: number;
  economyRate: number;
  badges: string;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export default function ProfileScreen() {
  const { db, user, signout } = useBasic();
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    fetchProfile();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchProfile = async () => {
    try {
      console.log('Fetching profile for user:', user?.email);
      const users = await db?.from('users').getAll();
      console.log('All users found:', users?.length || 0);
      console.log('Looking for user with email:', user?.email);
      
      if (users && users.length > 0) {
        console.log('All user emails:', (users as any[]).map(u => u.email));
        const userProfile = (users as any[])?.find(u => u.email === user?.email);
        console.log('Found user profile:', userProfile);
        
        if (userProfile) {
          setProfile(userProfile);
          console.log('Profile set successfully');
        } else {
          console.log('No profile found for current user');
          setProfile(null);
        }
      } else {
        console.log('No users found in database');
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signout();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const getBadges = (): Badge[] => {
    if (!profile?.badges) return [];
    
    try {
      const badgeIds = JSON.parse(profile.badges);
      const allBadges: Badge[] = [
        { id: 'century', name: 'Century Maker', icon: 'emoji-events', description: '100+ runs in a match' },
        { id: 'hattrick', name: 'Hat-Trick Hero', icon: 'sports-cricket', description: '3 wickets in a row' },
        { id: 'motm', name: 'Man of the Match', icon: 'star', description: 'Outstanding performance' },
        { id: 'fivewicket', name: 'Five-Wicket Haul', icon: 'whatshot', description: '5+ wickets in a match' },
        { id: 'teamspirit', name: 'Team Spirit', icon: 'group', description: 'Most matches played' },
      ];
      
      return allBadges.filter(badge => badgeIds.includes(badge.id));
    } catch {
      return [];
    }
  };

  const renderStatCard = (title: string, value: string | number, icon: string, color: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <MaterialIcons name={icon as any} size={24} color={color} />
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  const renderBadge = (badge: Badge) => (
    <View key={badge.id} style={styles.badge}>
      <MaterialIcons name={badge.icon as any} size={20} color="#FFD700" />
      <Text style={styles.badgeName}>{badge.name}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="person" size={60} color="#FFD700" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={60} color="#FF5722" />
          <Text style={styles.errorText}>Profile not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const badges = getBadges();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FFD700']}
            tintColor="#FFD700"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <MaterialIcons name="person" size={60} color="#1B5E20" />
            </View>
            <Text style={styles.playerName}>{profile.name}</Text>
            <View style={styles.jerseyContainer}>
              <MaterialIcons name="sports" size={20} color="#FFD700" />
              <Text style={styles.jerseyNumber}>#{profile.jerseyNumber}</Text>
            </View>
            {profile.bio && (
              <Text style={styles.bio}>{profile.bio}</Text>
            )}
          </View>

          {/* Cricket Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏏 Cricket Stats</Text>
            <View style={styles.statsGrid}>
              {renderStatCard('Matches', profile.matchesPlayed, 'sports-cricket', '#4CAF50')}
              {renderStatCard('Total Runs', profile.totalRuns, 'trending-up', '#FF9800')}
              {renderStatCard('Wickets', profile.totalWickets, 'whatshot', '#F44336')}
              {renderStatCard('Batting Avg', profile.battingAverage.toFixed(1), 'bar-chart', '#2196F3')}
              {renderStatCard('Strike Rate', profile.strikeRate.toFixed(1), 'speed', '#9C27B0')}
              {renderStatCard('Bowl Avg', profile.bowlingAverage.toFixed(1), 'sports-baseball', '#607D8B')}
            </View>
          </View>

          {/* Badges */}
          {badges.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏆 Achievements</Text>
              <View style={styles.badgesContainer}>
                {badges.map(renderBadge)}
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('AppSummary')}
              >
                <MaterialIcons name="analytics" size={24} color="#FFD700" />
                <Text style={styles.actionText}>App Overview</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <MaterialIcons name="edit" size={24} color="#FFD700" />
                <Text style={styles.actionText}>Edit Profile</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('AllPlayers')}
              >
                <MaterialIcons name="people" size={24} color="#FFD700" />
                <Text style={styles.actionText}>All Players</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Leaderboard')}
              >
                <MaterialIcons name="leaderboard" size={24} color="#FFD700" />
                <Text style={styles.actionText}>View Leaderboard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Tournament')}
              >
                <MaterialIcons name="emoji-events" size={24} color="#FFD700" />
                <Text style={styles.actionText}>Tournaments</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('CreateTeam')}
              >
                <MaterialIcons name="group-add" size={24} color="#FFD700" />
                <Text style={styles.actionText}>Create Team</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Debug')}
              >
                <MaterialIcons name="bug-report" size={24} color="#FFD700" />
                <Text style={styles.actionText}>Debug Info</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Out */}
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <MaterialIcons name="logout" size={24} color="#FF5722" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF5722',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#2E7D32',
  },
  playerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  jerseyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginBottom: 12,
  },
  jerseyNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 4,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statContent: {
    marginLeft: 12,
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  badgeName: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  actionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  actionText: {
    fontSize: 16,
    color: '#2E7D32',
    marginLeft: 12,
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  signOutText: {
    fontSize: 16,
    color: '#FF5722',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
