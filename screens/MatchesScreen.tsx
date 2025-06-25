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
import { useNavigation } from '@react-navigation/native';

interface Match {
  id: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  date: string;
  time: string;
  venue: string;
  format: string;
  status: string;
  tossWinner?: string;
  tossDecision?: string;
  currentScore?: string;
  currentOvers?: string;
  battingTeam?: string;
  createdAt: number;
}

export default function MatchesScreen() {
  const { db, user } = useBasic();
  const navigation = useNavigation<any>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'live' | 'completed'>('upcoming');
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    fetchMatches();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchMatches = async () => {
    try {
      const fetchedMatches = await db?.from('matches').getAll();
      if (fetchedMatches) {
        const sortedMatches = (fetchedMatches as any[]).sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time}`).getTime();
          const dateB = new Date(`${b.date} ${b.time}`).getTime();
          return dateB - dateA;
        });
        setMatches(sortedMatches);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      Alert.alert('Error', 'Failed to load matches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const handleOpenChat = (matchId: string) => {
    navigation.navigate('Chat', { matchId });
  };

  const handleViewAnalytics = (matchId: string) => {
    navigation.navigate('Analytics', { matchId });
  };

  const getFilteredMatches = () => {
    const now = new Date();
    
    return matches.filter(match => {
      const matchDateTime = new Date(`${match.date} ${match.time}`);
      
      switch (activeTab) {
        case 'upcoming':
          return match.status === 'scheduled' && matchDateTime > now;
        case 'live':
          return match.status === 'live' || match.status === 'in_progress';
        case 'completed':
          return match.status === 'completed' || (match.status === 'scheduled' && matchDateTime < now);
        default:
          return true;
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#2196F3';
      case 'live': return '#4CAF50';
      case 'in_progress': return '#FF9800';
      case 'completed': return '#9E9E9E';
      default: return '#666';
    }
  };

  const getStatusText = (match: Match) => {
    const matchDateTime = new Date(`${match.date} ${match.time}`);
    const now = new Date();
    
    if (match.status === 'live' || match.status === 'in_progress') {
      return 'LIVE';
    } else if (match.status === 'completed') {
      return 'COMPLETED';
    } else if (matchDateTime < now) {
      return 'FINISHED';
    } else {
      return 'UPCOMING';
    }
  };

  const formatMatchTime = (date: string, time: string) => {
    const matchDate = new Date(`${date} ${time}`);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (matchDate.toDateString() === today.toDateString()) {
      return `Today, ${time}`;
    } else if (matchDate.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${time}`;
    } else {
      return `${matchDate.toLocaleDateString()}, ${time}`;
    }
  };

  const renderMatch = ({ item }: { item: any }) => {
    const statusText = getStatusText(item);
    const statusColor = getStatusColor(item.status);
    const isLive = item.status === 'live' || item.status === 'in_progress';
    
    return (
      <Animated.View style={[styles.matchCard, { opacity: fadeAnim }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}
          activeOpacity={0.7}
        >
          {/* Match Header */}
          <View style={styles.matchHeader}>
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>{item.format}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{statusText}</Text>
              {isLive && (
                <View style={styles.liveDot} />
              )}
            </View>
          </View>

          {/* Teams */}
          <View style={styles.teamsContainer}>
            <View style={styles.teamRow}>
              <View style={styles.teamInfo}>
                <MaterialIcons name="group" size={20} color="#2E7D32" />
                <Text style={styles.teamName}>{item.teamAName}</Text>
              </View>
              {item.currentScore && item.battingTeam === item.teamAId && (
                <Text style={styles.scoreText}>{item.currentScore}</Text>
              )}
            </View>
            
            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
            </View>
            
            <View style={styles.teamRow}>
              <View style={styles.teamInfo}>
                <MaterialIcons name="group" size={20} color="#2E7D32" />
                <Text style={styles.teamName}>{item.teamBName}</Text>
              </View>
              {item.currentScore && item.battingTeam === item.teamBId && (
                <Text style={styles.scoreText}>{item.currentScore}</Text>
              )}
            </View>
          </View>

          {/* Match Details */}
          <View style={styles.matchDetails}>
            <View style={styles.detailRow}>
              <MaterialIcons name="schedule" size={16} color="#666" />
              <Text style={styles.detailText}>
                {formatMatchTime(item.date, item.time)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="location-on" size={16} color="#666" />
              <Text style={styles.detailText}>{item.venue}</Text>
            </View>
          </View>

          {/* Toss Info */}
          {item.tossWinner && (
            <View style={styles.tossInfo}>
              <MaterialIcons name="monetization-on" size={16} color="#FFD700" />
              <Text style={styles.tossText}>
                {item.tossWinner} won toss, chose to {item.tossDecision}
              </Text>
            </View>
          )}

          {/* Live Score */}
          {isLive && item.currentScore && (
            <View style={styles.liveScore}>
              <Text style={styles.liveScoreText}>
                {item.currentScore} ({item.currentOvers} overs)
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="visibility" size={18} color="#2E7D32" />
              <Text style={styles.actionButtonText}>View Details</Text>
            </TouchableOpacity>
            
            {isLive && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleOpenChat(item.id)}
              >
                <MaterialIcons name="chat" size={18} color="#2E7D32" />
                <Text style={styles.actionButtonText}>Chat</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleViewAnalytics(item.id)}
            >
              <MaterialIcons name="analytics" size={18} color="#2E7D32" />
              <Text style={styles.actionButtonText}>Stats</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="sports-cricket" size={80} color="#FFD700" />
      <Text style={styles.emptyTitle}>
        No {activeTab} matches
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'upcoming' 
          ? 'Schedule your first match to get started'
          : `No ${activeTab} matches found`
        }
      </Text>
      {activeTab === 'upcoming' && (
        <TouchableOpacity
          style={styles.createFirstMatch}
          onPress={() => navigation.navigate('CreateMatch')}
        >
          <Text style={styles.createFirstMatchText}>Schedule Match</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const filteredMatches = getFilteredMatches();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="sports-cricket" size={60} color="#FFD700" />
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
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
          style={[styles.tab, activeTab === 'live' && styles.activeTab]}
          onPress={() => setActiveTab('live')}
        >
          <MaterialIcons 
            name="play-circle-filled" 
            size={18} 
            color={activeTab === 'live' ? '#1B5E20' : '#666'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'live' && styles.activeTabText
          ]}>
            Live
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <MaterialIcons 
            name="check-circle" 
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
        data={filteredMatches}
        renderItem={renderMatch}
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
          filteredMatches.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateMatch')}
      >
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
  createFirstMatch: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  createFirstMatchText: {
    color: '#1B5E20',
    fontWeight: 'bold',
    fontSize: 16,
  },
  matchCard: {
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
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formatBadge: {
    backgroundColor: '#2E7D32',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  formatText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginLeft: 4,
  },
  teamsContainer: {
    marginBottom: 16,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 8,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  vsContainer: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  vsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  matchDetails: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  tossInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  tossText: {
    fontSize: 12,
    color: '#F57F17',
    marginLeft: 6,
    fontWeight: '500',
  },
  liveScore: {
    backgroundColor: '#E8F5E8',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  liveScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  actionsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
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
