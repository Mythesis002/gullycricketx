import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';

interface Tournament {
  id: string;
  name: string;
  creatorId: string;
  format: string;
  teamIds: string;
  matchIds: string;
  standings: string;
  status: string;
  createdAt: number;
}

export default function TournamentScreen() {
  const { db, user } = useBasic();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    fetchTournaments();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchTournaments = async () => {
    try {
      const fetchedTournaments = await db?.from('tournaments').getAll();
      if (fetchedTournaments) {
        const sortedTournaments = fetchedTournaments.sort((a, b) => b.createdAt - a.createdAt);
        setTournaments(sortedTournaments);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      Alert.alert('Error', 'Failed to load tournaments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTournaments();
  };

  const getFilteredTournaments = () => {
    return tournaments.filter(tournament => {
      switch (activeTab) {
        case 'active':
          return tournament.status === 'active' || tournament.status === 'in_progress';
        case 'upcoming':
          return tournament.status === 'upcoming' || tournament.status === 'registration_open';
        case 'completed':
          return tournament.status === 'completed';
        default:
          return true;
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'in_progress':
        return '#4CAF50';
      case 'upcoming':
      case 'registration_open':
        return '#2196F3';
      case 'completed':
        return '#9E9E9E';
      default:
        return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'ACTIVE';
      case 'in_progress':
        return 'IN PROGRESS';
      case 'upcoming':
        return 'UPCOMING';
      case 'registration_open':
        return 'REGISTRATION OPEN';
      case 'completed':
        return 'COMPLETED';
      default:
        return status.toUpperCase();
    }
  };

  const getTeamCount = (teamIds: string) => {
    try {
      return JSON.parse(teamIds).length;
    } catch {
      return 0;
    }
  };

  const getMatchCount = (matchIds: string) => {
    try {
      return JSON.parse(matchIds).length;
    } catch {
      return 0;
    }
  };

  const renderTournament = ({ item }: { item: Tournament }) => {
    const statusColor = getStatusColor(item.status);
    const statusText = getStatusText(item.status);
    const teamCount = getTeamCount(item.teamIds);
    const matchCount = getMatchCount(item.matchIds);
    
    return (
      <Animated.View style={[styles.tournamentCard, { opacity: fadeAnim }]}>
        <View style={styles.tournamentHeader}>
          <View style={styles.tournamentInfo}>
            <Text style={styles.tournamentName}>{item.name}</Text>
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>{item.format}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.tournamentStats}>
          <View style={styles.statItem}>
            <MaterialIcons name="group" size={20} color="#4CAF50" />
            <Text style={styles.statText}>{teamCount} Teams</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="sports-cricket" size={20} color="#4CAF50" />
            <Text style={styles.statText}>{matchCount} Matches</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="calendar-today" size={20} color="#4CAF50" />
            <Text style={styles.statText}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.tournamentActions}>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="visibility" size={20} color="#2E7D32" />
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="leaderboard" size={20} color="#2E7D32" />
            <Text style={styles.actionButtonText}>Standings</Text>
          </TouchableOpacity>
          
          {item.status === 'registration_open' && (
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="how-to-reg" size={20} color="#2E7D32" />
              <Text style={styles.actionButtonText}>Register</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="emoji-events" size={80} color="#FFD700" />
      <Text style={styles.emptyTitle}>
        No {activeTab} tournaments
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'active' 
          ? 'No tournaments are currently active'
          : activeTab === 'upcoming'
            ? 'No upcoming tournaments scheduled'
            : 'No completed tournaments found'
        }
      </Text>
      
      <View style={styles.tournamentFeatures}>
        <Text style={styles.featuresTitle}>🏆 Tournament Features:</Text>
        <Text style={styles.featureText}>• Knockout and Round-Robin formats</Text>
        <Text style={styles.featureText}>• Real-time standings and statistics</Text>
        <Text style={styles.featureText}>• Multi-team competitions</Text>
        <Text style={styles.featureText}>• Automated match scheduling</Text>
        <Text style={styles.featureText}>• Winner celebrations and badges</Text>
      </View>
    </View>
  );

  const filteredTournaments = getFilteredTournaments();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="emoji-events" size={60} color="#FFD700" />
          <Text style={styles.loadingText}>Loading tournaments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <MaterialIcons 
            name="play-circle-filled" 
            size={18} 
            color={activeTab === 'active' ? '#1B5E20' : '#666'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'active' && styles.activeTabText
          ]}>
            Active
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <MaterialIcons 
            name="schedule" 
            size={18} 
            color={activeTab === 'upcoming' ? '#1B5E20' : '#666'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'upcoming' && styles.activeTabText
          ]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <MaterialIcons 
            name="emoji-events" 
            size={18} 
            color={activeTab === 'completed' ? '#1B5E20' : '#666'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'completed' && styles.activeTabText
          ]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTournaments}
        renderItem={renderTournament}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FFD700']}
            tintColor="#FFD700"
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          filteredTournaments.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab}>
        <MaterialIcons name="add" size={28} color="#1B5E20" />
      </TouchableOpacity>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFD700',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
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
    textTransform: 'capitalize',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  tournamentFeatures: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    width: '100%',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 6,
  },
  formatBadge: {
    backgroundColor: '#2E7D32',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  formatText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tournamentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  tournamentActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#2E7D32',
    marginLeft: 4,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});