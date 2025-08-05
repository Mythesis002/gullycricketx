import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../utils/supabaseClient';

export default function AppSummaryScreen() {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalTeams: 0,
    totalMatches: 0,
    recentUsers: [] as any[],
    recentPosts: [] as any[],
    recentTeams: [] as any[],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch all data from Supabase
      const [usersRes, postsRes, teamsRes, matchesRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('posts').select('*'),
        supabase.from('teams').select('*').eq('is_deleted', false),
        supabase.from('matches').select('*'),
      ]);
      if (usersRes.error || postsRes.error || teamsRes.error || matchesRes.error) {
        throw usersRes.error || postsRes.error || teamsRes.error || matchesRes.error;
      }
      const users = usersRes.data || [];
      const posts = postsRes.data || [];
      const teams = teamsRes.data || [];
      const matches = matchesRes.data || [];
      // Calculate stats
      const totalUsers = users.length;
      const totalPosts = posts.length;
      const totalTeams = teams.length;
      const totalMatches = matches.length;
      // Get recent items (last 5)
      const recentUsers = users.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
      const recentPosts = posts.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
      const recentTeams = teams.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
      setStats({
        totalUsers,
        totalPosts,
        totalTeams,
        totalMatches,
        recentUsers,
        recentPosts,
        recentTeams,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const renderStatCard = (title: string, value: number, icon: string, color: string, onPress?: () => void) => (
    <TouchableOpacity 
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <MaterialIcons name={icon as any} size={32} color={color} />
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      {onPress && (
        <MaterialIcons name="arrow-forward-ios" size={16} color="#666" />
      )}
    </TouchableOpacity>
  );

  const renderRecentItem = (item: any, type: 'user' | 'post' | 'team') => {
    let title = '';
    let subtitle = '';
    let icon = '';
    
    switch (type) {
      case 'user':
        title = item.name || 'Unknown User';
        subtitle = `Jersey #${item.jerseyNumber || '00'}`;
        icon = 'person';
        break;
      case 'post':
        title = item.userName || 'Unknown User';
        subtitle = item.text ? item.text.substring(0, 50) + '...' : 'Image post';
        icon = 'article';
        break;
      case 'team':
        title = item.name || 'Unknown Team';
        subtitle = `Captain: ${item.captainName || 'Unknown'}`;
        icon = 'group';
        break;
    }

    return (
      <View key={item.id} style={styles.recentItem}>
        <MaterialIcons name={icon as any} size={20} color="#FFD700" />
        <View style={styles.recentItemContent}>
          <Text style={styles.recentItemTitle}>{title}</Text>
          <Text style={styles.recentItemSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.recentItemTime}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="analytics" size={60} color="#FFD700" />
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="analytics" size={24} color="#FFD700" />
          <Text style={styles.headerTitle}>GullyCricketX Overview</Text>
        </View>

        {/* Current User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Current User</Text>
          <View style={styles.currentUserCard}>
            <MaterialIcons name="person" size={24} color="#FFD700" />
            <View style={styles.currentUserInfo}>
              <Text style={styles.currentUserName}>{user?.name || user?.email || 'Unknown'}</Text>
            </View>
          </View>
        </View>

        {/* Statistics Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 App Statistics</Text>
          <View style={styles.statsGrid}>
            {renderStatCard(
              'Total Players', 
              stats.totalUsers, 
              'people', 
              '#4CAF50',
              () => navigation.navigate('AllPlayers')
            )}
            {renderStatCard(
              'Total Posts', 
              stats.totalPosts, 
              'article', 
              '#FF9800',
              () => navigation.navigate('Feed')
            )}
            {renderStatCard(
              'Total Teams', 
              stats.totalTeams, 
              'group', 
              '#2196F3',
              () => navigation.navigate('Teams')
            )}
            {renderStatCard(
              'Total Matches', 
              stats.totalMatches, 
              'sports-cricket', 
              '#9C27B0',
              () => navigation.navigate('Matches')
            )}
          </View>
        </View>

        {/* Recent Activity */}
        {stats.recentUsers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🆕 Recent Players</Text>
            <View style={styles.recentContainer}>
              {stats.recentUsers.map(item => renderRecentItem(item, 'user'))}
            </View>
          </View>
        )}

        {stats.recentPosts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Recent Posts</Text>
            <View style={styles.recentContainer}>
              {stats.recentPosts.map(item => renderRecentItem(item, 'post'))}
            </View>
          </View>
        )}

        {stats.recentTeams.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏏 Recent Teams</Text>
            <View style={styles.recentContainer}>
              {stats.recentTeams.map(item => renderRecentItem(item, 'team'))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('CreatePost')}
            >
              <MaterialIcons name="add-circle" size={24} color="#FFD700" />
              <Text style={styles.actionText}>Create Post</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('TeamDetailsScreen')}
            >
              <MaterialIcons name="group-add" size={24} color="#FFD700" />
              <Text style={styles.actionText}>Create Team</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('AllPlayers')}
            >
              <MaterialIcons name="people" size={24} color="#FFD700" />
              <Text style={styles.actionText}>View All Players</Text>
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
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  currentUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  currentUserInfo: {
    marginLeft: 12,
    flex: 1,
  },
  currentUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  currentUserEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  recentContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  recentItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  recentItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  recentItemSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  recentItemTime: {
    fontSize: 10,
    color: '#999',
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
});