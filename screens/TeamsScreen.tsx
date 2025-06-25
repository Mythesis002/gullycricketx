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

interface Team {
  id: string;
  name: string;
  captainId: string;
  captainName: string;
  playerIds: string;
  playerNames: string;
  createdAt: number;
}

export default function TeamsScreen() {
  const { db, user } = useBasic();
  const navigation = useNavigation<any>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    fetchTeams();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchTeams = async () => {
    try {
      const fetchedTeams = await db?.from('teams').getAll();
      if (fetchedTeams) {
        const sortedTeams = (fetchedTeams as any[]).sort((a, b) => b.createdAt - a.createdAt);
        setTeams(sortedTeams);
        
        // Filter teams where user is captain or player
        const userTeams = sortedTeams.filter((team: any) => {
          const playerIds = team.playerIds ? JSON.parse(team.playerIds) : [];
          return team.captainId === user?.id || playerIds.includes(user?.id);
        });
        setMyTeams(userTeams);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      Alert.alert('Error', 'Failed to load teams');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTeams();
  };

  const getPlayerCount = (playerIds: string) => {
    try {
      return JSON.parse(playerIds).length;
    } catch {
      return 0;
    }
  };

  const renderTeam = ({ item }: { item: Team }) => {
    const playerCount = getPlayerCount(item.playerIds);
    const isCaptain = item.captainId === user?.id;
    
    return (
      <Animated.View style={[styles.teamCard, { opacity: fadeAnim }]}>
        <View style={styles.teamHeader}>
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>{item.name}</Text>
            <View style={styles.captainInfo}>
              <MaterialIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.captainName}>Captain: {item.captainName}</Text>
            </View>
          </View>
          {isCaptain && (
            <View style={styles.captainBadge}>
              <MaterialIcons name="military-tech" size={16} color="#FFD700" />
            </View>
          )}
        </View>

        <View style={styles.teamStats}>
          <View style={styles.statItem}>
            <MaterialIcons name="group" size={20} color="#4CAF50" />
            <Text style={styles.statText}>{playerCount} Players</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="calendar-today" size={20} color="#4CAF50" />
            <Text style={styles.statText}>
              Created {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.teamActions}>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="visibility" size={20} color="#2E7D32" />
            <Text style={styles.actionButtonText}>View Team</Text>
          </TouchableOpacity>
          
          {isCaptain && (
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="edit" size={20} color="#2E7D32" />
              <Text style={styles.actionButtonText}>Manage</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="sports-cricket" size={20} color="#2E7D32" />
            <Text style={styles.actionButtonText}>Matches</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="group" size={80} color="#FFD700" />
      <Text style={styles.emptyTitle}>
        {activeTab === 'all' ? 'No Teams Yet!' : 'No Teams Found!'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'all' 
          ? 'Be the first to create a cricket team'
          : 'You haven\'t joined or created any teams yet'
        }
      </Text>
      <TouchableOpacity
        style={styles.createFirstTeam}
        onPress={() => navigation.navigate('CreateTeam')}
      >
        <Text style={styles.createFirstTeamText}>Create Team</Text>
      </TouchableOpacity>
    </View>
  );

  const currentTeams = activeTab === 'all' ? teams : myTeams;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="group" size={60} color="#FFD700" />
          <Text style={styles.loadingText}>Loading teams...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <MaterialIcons 
            name="public" 
            size={20} 
            color={activeTab === 'all' ? '#1B5E20' : '#666'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'all' && styles.activeTabText
          ]}>
            All Teams
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.activeTab]}
          onPress={() => setActiveTab('my')}
        >
          <MaterialIcons 
            name="person" 
            size={20} 
            color={activeTab === 'my' ? '#1B5E20' : '#666'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'my' && styles.activeTabText
          ]}>
            My Teams
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={currentTeams}
        renderItem={renderTeam}
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
          currentTeams.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTeam')}
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
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFD700',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
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
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createFirstTeam: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  createFirstTeamText: {
    color: '#1B5E20',
    fontWeight: 'bold',
    fontSize: 16,
  },
  teamCard: {
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
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  captainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  captainName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  captainBadge: {
    backgroundColor: '#2E7D32',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamStats: {
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
  teamActions: {
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
