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
import { supabase } from '../utils/supabaseClient';

interface Player {
  id: string;
  name: string;
  jerseyNumber: string;
  matchesPlayed: number;
  totalRuns: number;
  totalWickets: number;
  battingAverage: number;
  strikeRate: number;
  bowlingAverage: number;
  economyRate: number;
  badges: string;
}

type LeaderboardCategory = 'runs' | 'wickets' | 'average' | 'strike_rate' | 'matches';

export default function LeaderboardScreen() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('runs');
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    fetchPlayers();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchPlayers = async () => {
    try {
      const { data: fetchedPlayers, error } = await supabase.from('users').select('*');
      if (error) throw error;
      if (fetchedPlayers) {
        setPlayers(fetchedPlayers as any[]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load leaderboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlayers();
  };

  const getSortedPlayers = () => {
    const filteredPlayers = players.filter(player => player.matchesPlayed > 0);
    
    return filteredPlayers.sort((a, b) => {
      switch (activeCategory) {
        case 'runs':
          return b.totalRuns - a.totalRuns;
        case 'wickets':
          return b.totalWickets - a.totalWickets;
        case 'average':
          return b.battingAverage - a.battingAverage;
        case 'strike_rate':
          return b.strikeRate - a.strikeRate;
        case 'matches':
          return b.matchesPlayed - a.matchesPlayed;
        default:
          return 0;
      }
    }).slice(0, 50); // Top 50 players
  };

  const getCategoryTitle = (category: LeaderboardCategory) => {
    switch (category) {
      case 'runs':
        return 'Most Runs';
      case 'wickets':
        return 'Most Wickets';
      case 'average':
        return 'Best Batting Average';
      case 'strike_rate':
        return 'Best Strike Rate';
      case 'matches':
        return 'Most Matches';
      default:
        return 'Leaderboard';
    }
  };

  const getCategoryValue = (player: Player, category: LeaderboardCategory) => {
    switch (category) {
      case 'runs':
        return player.totalRuns.toString();
      case 'wickets':
        return player.totalWickets.toString();
      case 'average':
        return player.battingAverage.toFixed(1);
      case 'strike_rate':
        return player.strikeRate.toFixed(1);
      case 'matches':
        return player.matchesPlayed.toString();
      default:
        return '0';
    }
  };

  const getCategoryIcon = (category: LeaderboardCategory) => {
    switch (category) {
      case 'runs':
        return 'trending-up';
      case 'wickets':
        return 'whatshot';
      case 'average':
        return 'bar-chart';
      case 'strike_rate':
        return 'speed';
      case 'matches':
        return 'sports-cricket';
      default:
        return 'leaderboard';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return { name: 'emoji-events', color: '#FFD700' };
      case 2:
        return { name: 'emoji-events', color: '#C0C0C0' };
      case 3:
        return { name: 'emoji-events', color: '#CD7F32' };
      default:
        return { name: 'person', color: '#666' };
    }
  };

  const getBadgeCount = (badges: string) => {
    try {
      return JSON.parse(badges).length;
    } catch {
      return 0;
    }
  };

  const renderPlayer = ({ item, index }: { item: any; index: number }) => {
    const rank = index + 1;
    const rankIcon = getRankIcon(rank);
    const categoryValue = getCategoryValue(item, activeCategory);
    const badgeCount = getBadgeCount(item.badges);
    
    return (
      <Animated.View style={[styles.playerCard, { opacity: fadeAnim }]}>
        <View style={styles.rankContainer}>
          <MaterialIcons 
            name={rankIcon.name as any} 
            size={rank <= 3 ? 32 : 24} 
            color={rankIcon.color} 
          />
          <Text style={[
            styles.rankText,
            rank <= 3 && styles.topRankText
          ]}>
            #{rank}
          </Text>
        </View>

        <View style={styles.playerInfo}>
          <View style={styles.playerHeader}>
            <Text style={styles.playerName}>{item.name}</Text>
            <View style={styles.jerseyContainer}>
              <MaterialIcons name="sports" size={14} color="#FFD700" />
              <Text style={styles.jerseyNumber}>#{item.jerseyNumber}</Text>
            </View>
          </View>
          
          <View style={styles.playerStats}>
            <Text style={styles.categoryValue}>{categoryValue}</Text>
            <Text style={styles.categoryLabel}>
              {activeCategory === 'average' || activeCategory === 'strike_rate' 
                ? activeCategory.replace('_', ' ').toUpperCase()
                : getCategoryTitle(activeCategory).split(' ')[1] || getCategoryTitle(activeCategory)
              }
            </Text>
          </View>
          
          <View style={styles.playerMeta}>
            <View style={styles.metaItem}>
              <MaterialIcons name="sports-cricket" size={16} color="#666" />
              <Text style={styles.metaText}>{item.matchesPlayed} matches</Text>
            </View>
            {badgeCount > 0 && (
              <View style={styles.metaItem}>
                <MaterialIcons name="military-tech" size={16} color="#FFD700" />
                <Text style={styles.metaText}>{badgeCount} badges</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.viewButton}>
          <MaterialIcons name="visibility" size={20} color="#2E7D32" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="leaderboard" size={80} color="#FFD700" />
      <Text style={styles.emptyTitle}>No Statistics Yet!</Text>
      <Text style={styles.emptySubtitle}>
        Players need to complete matches to appear on the leaderboard
      </Text>
      
      <View style={styles.leaderboardInfo}>
        <Text style={styles.infoTitle}>🏆 Leaderboard Categories:</Text>
        <Text style={styles.infoText}>• Most Runs - Total runs scored</Text>
        <Text style={styles.infoText}>• Most Wickets - Total wickets taken</Text>
        <Text style={styles.infoText}>• Best Average - Batting average</Text>
        <Text style={styles.infoText}>• Best Strike Rate - Runs per 100 balls</Text>
        <Text style={styles.infoText}>• Most Matches - Games played</Text>
      </View>
    </View>
  );

  const categories: { key: LeaderboardCategory; label: string }[] = [
    { key: 'runs', label: 'Runs' },
    { key: 'wickets', label: 'Wickets' },
    { key: 'average', label: 'Average' },
    { key: 'strike_rate', label: 'Strike Rate' },
    { key: 'matches', label: 'Matches' },
  ];

  const sortedPlayers = getSortedPlayers();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="leaderboard" size={60} color="#FFD700" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Category Selector */}
      <View style={styles.categoryContainer}>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryButton,
                activeCategory === item.key && styles.activeCategoryButton
              ]}
              onPress={() => setActiveCategory(item.key)}
            >
              <MaterialIcons 
                name={getCategoryIcon(item.key)} 
                size={20} 
                color={activeCategory === item.key ? '#1B5E20' : '#666'} 
              />
              <Text style={[
                styles.categoryButtonText,
                activeCategory === item.key && styles.activeCategoryButtonText
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name={getCategoryIcon(activeCategory)} size={24} color="#FFD700" />
        <Text style={styles.headerTitle}>{getCategoryTitle(activeCategory)}</Text>
        <Text style={styles.headerSubtitle}>Top {sortedPlayers.length} Players</Text>
      </View>

      {/* Leaderboard */}
      <FlatList
        data={sortedPlayers}
        renderItem={renderPlayer}
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
          sortedPlayers.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        showsVerticalScrollIndicator={false}
      />
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
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  activeCategoryButton: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
  },
  activeCategoryButtonText: {
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
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
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  leaderboardInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    width: '100%',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  rankContainer: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 50,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 4,
  },
  topRankText: {
    color: '#2E7D32',
    fontSize: 14,
  },
  playerInfo: {
    flex: 1,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    flex: 1,
  },
  jerseyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  jerseyNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 2,
  },
  playerStats: {
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  categoryLabel: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  playerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  viewButton: {
    padding: 8,
    marginLeft: 12,
  },
});
