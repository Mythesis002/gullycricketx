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
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
// import { useNavigation } from '@react-navigation/native';
import { supabase } from '../utils/supabaseClient';

interface Team {
  id: string;
  name: string;
  captainId: string;
  captainName: string;
  playerIds: string;
  playerNames: string;
  createdAt: number;
  logo_url?: string;
  players?: { id: string; name: string; role: string; profilePicture?: string }[];
}

export default function TeamsScreen({ navigation }) {
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const fadeAnim = new Animated.Value(0);
  const [deletingTeamId, setDeletingTeamId] = useState(null);

  useEffect(() => {
    fetchTeams();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);
    })();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      console.log('Current user ID:', uid, 'Type:', typeof uid);
      const { data, error } = await supabase.from('teams').select('*').eq('is_deleted', false);
      if (error) throw error;
      if (data) {
        console.log('Raw teams from DB:', data);
        const parsedTeams = data.map(team => {
          let parsedPlayers = team.players;
          try {
            if (typeof team.players === 'string') {
              parsedPlayers = JSON.parse(team.players);
            }
          } catch (e) {
            console.log('Error parsing players for team', team.id, e);
          }
          console.log('Team', team.id, 'created_by:', team.created_by, 'Type:', typeof team.created_by);
          return {
            ...team,
            players: parsedPlayers
          };
        });
        console.log('Parsed teams:', parsedTeams);
        const myTeams = parsedTeams.filter((team) => team.created_by === uid);
        // Sort by createdAt descending (latest first)
        myTeams.sort((a, b) => (b.createdat || 0) - (a.createdat || 0));
        console.log('Filtered myTeams:', myTeams);
        setMyTeams(myTeams);
      }
    } catch (error) {
      console.log('Error in fetchTeams:', error);
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

  function getInitials(name) {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  function getRoleLabel(role) {
    return role;
  }

  function getCaptain(team) {
    if (!Array.isArray(team.players)) return null;
    return team.players.find(p => p.role === 'Captain');
  }
  function getViceCaptain(team) {
    if (!Array.isArray(team.players)) return null;
    return team.players.find(p => p.role === 'Vice-Captain');
  }

  const handleDeleteTeam = async (teamId) => {
    Alert.alert(
      'Delete Team',
      'Are you sure you want to delete this team? (It will not be shown in your list or as an opponent)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingTeamId(teamId);
            try {
              console.log('Delete pressed for team:', teamId);
              const { error } = await supabase.from('teams').update({ is_deleted: true }).eq('id', teamId);
              if (error) {
                console.log('Delete error:', error);
                Alert.alert('Error', 'Failed to delete team: ' + (error.message || JSON.stringify(error)));
              } else {
                setMyTeams((prev) => prev.filter((t) => t.id !== teamId));
              }
            } catch (e) {
              console.log('Unexpected delete error:', e);
              Alert.alert('Error', 'Unexpected error: ' + (e.message || JSON.stringify(e)));
            } finally {
              setDeletingTeamId(null);
            }
          },
        },
      ]
    );
  };

  const renderTeamCard = ({ item }) => {
    try {
      const captain = getCaptain(item);
      const viceCaptain = getViceCaptain(item);
      return (
        <View style={styles.card}>
          {/* Team Header */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.teamIconBox}>
              <MaterialIcons name="sports-cricket" size={28} color="#2E7D32" />
            </View>
            <View style={styles.teamInfo}>
              <Text style={styles.cardTeamName}>{item.name}</Text>
              <Text style={styles.cardPlayerCount}>{item.players?.length || 0}/11 Players</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="edit" size={20} color="#2E7D32" />
              </TouchableOpacity>
              <Pressable
                onPress={() => handleDeleteTeam(item.id)}
                style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel="Delete Team"
              >
                {deletingTeamId === item.id ? (
                  <ActivityIndicator size={20} color="#FF3040" />
                ) : (
                  <MaterialIcons name="delete" size={20} color="#FF3040" />
                )}
              </Pressable>
            </View>
          </View>

          {/* Leadership Section */}
          {(captain || viceCaptain) && (
            <View style={styles.leadershipSection}>
              {captain && (
                <View style={styles.leaderItem}>
                  <View style={styles.captainBadge}>
                    <MaterialIcons name="star" size={16} color="#FFD700" />
                  </View>
                  <View style={styles.leaderInfo}>
                    <Text style={styles.leaderLabel}>Captain</Text>
                    <Text style={styles.leaderName}>{captain.name}</Text>
                  </View>
                </View>
              )}
              {viceCaptain && (
                <View style={styles.leaderItem}>
                  <View style={styles.viceCaptainBadge}>
                    <MaterialIcons name="star-outline" size={16} color="#666" />
                  </View>
                  <View style={styles.leaderInfo}>
                    <Text style={styles.leaderLabel}>Vice Captain</Text>
                    <Text style={styles.leaderName}>{viceCaptain.name}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Players Section */}
          <View style={styles.playersSection}>
            <Text style={styles.playersTitleCard}>Squad</Text>
            <View style={styles.playersGrid}>
              {Array.isArray(item.players) && item.players.map((p, idx) => (
                <View key={p.id} style={styles.playerCard}>
                  <View style={styles.playerAvatar}>
                    {p.profilePicture ? (
                      <Image 
                        source={{ uri: p.profilePicture }} 
                        style={styles.playerProfileImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.playerInitials}>{getInitials(p.name)}</Text>
                    )}
                  </View>
                  <Text style={styles.playerNameCard}>{p.name}</Text>
                  <Text style={styles.playerRoleCard}>{p.role}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    } catch (e) {
      console.log('Error rendering team card:', e, item);
      return null;
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="group" size={80} color="#FFD700" />
      <Text style={styles.emptyTitle}>No Teams Found!</Text>
      <Text style={styles.emptySubtitle}>You haven't created any teams yet</Text>
    </View>
  );

  // Restore FlatList with card UI for each team
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Professional Header with Create Team Button */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="sports-cricket" size={24} color="#2E7D32" />
            <Text style={styles.headerTitle}>My Teams</Text>
          </View>
          <TouchableOpacity
            style={styles.createTeamButton}
            onPress={() => navigation.navigate('CreateTeamScreen')}
          >
            <MaterialIcons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.createTeamButtonText}>Create Team</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={myTeams}
        renderItem={renderTeamCard}
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
          myTeams.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
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
  teamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eee',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eee',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  teamName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  captainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  captainName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  playersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 6,
    gap: 8,
  },
  playerBadge: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
    alignItems: 'center',
  },
  playerInitials: {
    fontWeight: 'bold',
    color: '#4cd137',
    fontSize: 13,
  },
  playerName: {
    fontSize: 13,
    color: '#222',
  },
  playerRole: {
    fontSize: 11,
    color: '#888',
  },
  teamMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  playerCount: {
    fontSize: 13,
    color: '#888',
  },
  createdDate: {
    fontSize: 13,
    color: '#888',
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
  tabContainerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingTop: 16,
    paddingBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 8,
  },
  createTeamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  createTeamButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  captainLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  viceCaptainLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  viceCaptainName: {
    fontSize: 14,
    color: '#666',
  },
  playersListSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  playersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 8,
  },
  playerNameList: {
    fontSize: 14,
    color: '#222',
    fontWeight: '500',
  },
  playerRoleList: {
    fontSize: 14,
    color: '#888',
  },
  teamActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  actionButtonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  actionButtonTextCard: {
    fontSize: 12,
    color: '#2E7D32',
    marginLeft: 4,
    fontWeight: '500',
  },
  createTeamButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teamInfo: {
    flex: 1,
  },
  cardTeamName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 2,
  },
  cardPlayerCount: {
    fontSize: 13,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  leadershipSection: {
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  leaderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  leaderLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  leaderName: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  captainBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3CD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  viceCaptainBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  playersSection: {
    marginTop: 8,
  },
  playersTitleCard: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  playerCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  playerProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  playerInitials: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  playerNameCard: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  playerRoleCard: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
  },
});
