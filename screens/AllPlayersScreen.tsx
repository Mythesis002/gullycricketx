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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';

interface Player {
  id: string;
  name: string;
  email: string;
  jerseyNumber: string;
  bio: string;
  matchesPlayed: number;
  totalRuns: number;
  totalWickets: number;
  createdAt: number;
}

export default function AllPlayersScreen() {
  const { db, user } = useBasic();
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    fetchPlayers();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    filterPlayers();
  }, [searchQuery, players]);

  const fetchPlayers = async () => {
    try {
      console.log('Fetching all players...');
      const users = await db?.from('users').getAll();
      console.log('Found users:', users?.length || 0);
      
      if (users) {
        const sortedPlayers = (users as any[])
          .map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            jerseyNumber: u.jerseyNumber,
            bio: u.bio || '',
            matchesPlayed: u.matchesPlayed || 0,
            totalRuns: u.totalRuns || 0,
            totalWickets: u.totalWickets || 0,
            createdAt: u.createdAt || Date.now(),
          }))
          .sort((a, b) => b.createdAt - a.createdAt);
        
        setPlayers(sortedPlayers);
        console.log('Players loaded:', sortedPlayers.map(p => ({ name: p.name, jersey: p.jerseyNumber })));
      }
    } catch (error) {
      console.error('Error fetching players:', error);
      Alert.alert('Error', 'Failed to load players');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterPlayers = () => {
    if (!searchQuery.trim()) {
      setFilteredPlayers(players);
    } else {
      const filtered = players.filter(player =>
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.jerseyNumber.includes(searchQuery) ||
        player.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPlayers(filtered);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlayers();
  };

  const renderPlayer = ({ item }: { item: Player }) => {
    const isCurrentUser = item.email === user?.email;
    
    return (
      <Animated.View style={[
        styles.playerCard, 
        { opacity: fadeAnim },
        isCurrentUser && styles.currentUserCard
      ]}>
        <View style={styles.playerHeader}>
          <View style={styles.playerInfo}>
            <View style={[styles.avatar, isCurrentUser && styles.currentUserAvatar]}>
              <MaterialIcons name="person" size={24} color={isCurrentUser ? "#FFD700" : "#1B5E20"} />
            </View>
            <View style={styles.playerDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.playerName}>{item.name}</Text>
                {isCurrentUser && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>YOU</Text>
                  </View>
                )}
              </View>
              <View style={styles.jerseyContainer}>
                <MaterialIcons name="sports" size={14} color="#FFD700" />
                <Text style={styles.jerseyNumber}>#{item.jerseyNumber}</Text>
              </View>
              {item.bio && (
                <Text style={styles.playerBio} numberOfLines={2}>{item.bio}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.playerStats}>
          <View style={styles.statItem}>
            <MaterialIcons name="sports-cricket" size={16} color="#4CAF50" />
            <Text style={styles.statText}>{item.matchesPlayed} matches</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="trending-up" size={16} color="#FF9800" />
            <Text style={styles.statText}>{item.totalRuns} runs</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="whatshot" size={16} color="#F44336" />
            <Text style={styles.statText}>{item.totalWickets} wickets</Text>
          </View>
        </View>

        <View style={styles.playerActions}>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="visibility" size={16} color="#2E7D32" />
            <Text style={styles.actionButtonText}>View Profile</Text>
          </TouchableOpacity>
          
          {!isCurrentUser && (
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="message" size={16} color="#2E7D32" />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="group-add" size={16} color="#2E7D32" />
            <Text style={styles.actionButtonText}>Invite</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="people" size={80} color="#FFD700" />
      <Text style={styles.emptyTitle}>No Players Found!</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try a different search term' : 'No players have registered yet'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="people" size={60} color="#FFD700" />
          <Text style={styles.loadingText}>Loading players...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name="people" size={24} color="#FFD700" />
        <Text style={styles.headerTitle}>All Players ({players.length})</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#FFD700" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, jersey number, or email..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Players List */}
      <FlatList
        data={filteredPlayers}
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
          filteredPlayers.length === 0 ? styles.emptyContainer : styles.listContainer
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
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
  },
  playerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  currentUserCard: {
    borderColor: '#FFD700',
    backgroundColor: '#FFF9E6',
  },
  playerHeader: {
    marginBottom: 12,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currentUserAvatar: {
    backgroundColor: '#2E7D32',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  playerDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  youBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  jerseyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  jerseyNumber: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  playerBio: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  playerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
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
  playerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
});