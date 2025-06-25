import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';
import { useNavigation } from '@react-navigation/native';

interface Player {
  id: string;
  name: string;
  jerseyNumber: string;
  matchesPlayed: number;
}

export default function CreateTeamScreen() {
  const { db, user } = useBasic();
  const navigation = useNavigation<any>();
  const [teamName, setTeamName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const users = await db?.from('users').getAll();
      if (users) {
        // Exclude current user from the list
        const players = (users as any[])
          .filter(u => u.id !== user?.id)
          .map(u => ({
            id: u.id,
            name: u.name,
            jerseyNumber: u.jerseyNumber,
            matchesPlayed: u.matchesPlayed || 0,
          }));
        setAllPlayers(players);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
      Alert.alert('Error', 'Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = allPlayers.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.jerseyNumber.includes(searchQuery)
  );

  const togglePlayerSelection = (player: Player) => {
    const isSelected = selectedPlayers.some(p => p.id === player.id);
    
    if (isSelected) {
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
    } else {
      if (selectedPlayers.length >= 10) {
        Alert.alert('Limit Reached', 'You can select maximum 10 players for a team.');
        return;
      }
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Error', 'Please enter a team name.');
      return;
    }

    if (selectedPlayers.length < 5) {
      Alert.alert('Error', 'Please select at least 5 players for your team.');
      return;
    }

    setCreating(true);

    try {
      // Get current user profile for captain info
      const users = await db?.from('users').getAll();
      const currentUser = users?.find(u => u.email === user?.email);

      const teamData = {
        name: teamName.trim(),
        captainId: user?.id || '',
        captainName: currentUser?.name || user?.name || 'Unknown',
        playerIds: JSON.stringify(selectedPlayers.map(p => p.id)),
        playerNames: JSON.stringify(selectedPlayers.map(p => p.name)),
        createdAt: Date.now(),
      };

      await db?.from('teams').add(teamData);

      // Send notifications to selected players
      for (const player of selectedPlayers) {
        const notificationData = {
          userId: player.id,
          title: 'Team Invitation! 🏏',
          message: `You've been invited to join "${teamName}" by ${currentUser?.name}. Accept to start playing!`,
          type: 'team_invitation',
          read: false,
          createdAt: Date.now(),
        };
        await db?.from('notifications').add(notificationData);
      }

      Alert.alert(
        'Success! 🎉',
        `Team "${teamName}" created successfully! Invitations sent to all players.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating team:', error);
      Alert.alert('Error', 'Failed to create team. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const renderPlayer = ({ item }: { item: Player }) => {
    const isSelected = selectedPlayers.some(p => p.id === item.id);
    
    return (
      <TouchableOpacity
        style={[styles.playerCard, isSelected && styles.selectedPlayerCard]}
        onPress={() => togglePlayerSelection(item)}
      >
        <View style={styles.playerInfo}>
          <View style={[styles.playerAvatar, isSelected && styles.selectedAvatar]}>
            <MaterialIcons 
              name="person" 
              size={24} 
              color={isSelected ? '#1B5E20' : '#FFD700'} 
            />
          </View>
          <View style={styles.playerDetails}>
            <Text style={[styles.playerName, isSelected && styles.selectedText]}>
              {item.name}
            </Text>
            <View style={styles.playerMeta}>
              <MaterialIcons 
                name="sports" 
                size={14} 
                color={isSelected ? '#FFD700' : '#666'} 
              />
              <Text style={[styles.jerseyText, isSelected && styles.selectedText]}>
                #{item.jerseyNumber}
              </Text>
              <Text style={[styles.matchesText, isSelected && styles.selectedText]}>
                • {item.matchesPlayed} matches
              </Text>
            </View>
          </View>
        </View>
        
        <View style={[styles.selectionIndicator, isSelected && styles.selectedIndicator]}>
          <MaterialIcons 
            name={isSelected ? "check-circle" : "radio-button-unchecked"} 
            size={24} 
            color={isSelected ? '#FFD700' : '#CCC'} 
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderSelectedPlayer = (player: Player, index: number) => (
    <View key={player.id} style={styles.selectedPlayerChip}>
      <Text style={styles.selectedPlayerName}>{player.name}</Text>
      <TouchableOpacity onPress={() => togglePlayerSelection(player)}>
        <MaterialIcons name="close" size={16} color="#FFD700" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons name="group-add" size={24} color="#FFD700" />
            <Text style={styles.headerTitle}>Create Your Cricket Team</Text>
          </View>

          {/* Team Name Input */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Team Name</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="sports-cricket" size={24} color="#FFD700" />
              <TextInput
                style={styles.textInput}
                placeholder="Enter team name (e.g., Street Warriors)"
                placeholderTextColor="#999"
                value={teamName}
                onChangeText={setTeamName}
                maxLength={30}
              />
            </View>
          </View>

          {/* Selected Players */}
          {selectedPlayers.length > 0 && (
            <View style={styles.selectedSection}>
              <Text style={styles.sectionTitle}>
                Selected Players ({selectedPlayers.length}/10)
              </Text>
              <View style={styles.selectedPlayersContainer}>
                {selectedPlayers.map(renderSelectedPlayer)}
              </View>
            </View>
          )}

          {/* Player Search */}
          <View style={styles.searchSection}>
            <Text style={styles.sectionTitle}>Add Players</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="search" size={24} color="#FFD700" />
              <TextInput
                style={styles.textInput}
                placeholder="Search by name or jersey number"
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Players List */}
          <View style={styles.playersSection}>
            <Text style={styles.sectionTitle}>Available Players</Text>
            {loading ? (
              <View style={styles.loadingContainer}>
                <MaterialIcons name="hourglass-empty" size={40} color="#FFD700" />
                <Text style={styles.loadingText}>Loading players...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredPlayers}
                renderItem={renderPlayer}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <MaterialIcons name="search-off" size={40} color="#CCC" />
                    <Text style={styles.emptyText}>No players found</Text>
                  </View>
                }
              />
            )}
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              { opacity: (!teamName.trim() || selectedPlayers.length < 5 || creating) ? 0.5 : 1 }
            ]}
            onPress={handleCreateTeam}
            disabled={!teamName.trim() || selectedPlayers.length < 5 || creating}
          >
            <MaterialIcons 
              name={creating ? "hourglass-empty" : "group-add"} 
              size={24} 
              color="#1B5E20" 
            />
            <Text style={styles.createButtonText}>
              {creating ? 'Creating Team...' : 'Create Team'}
            </Text>
          </TouchableOpacity>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Team Creation Tips:</Text>
            <Text style={styles.tipText}>• Choose a catchy team name</Text>
            <Text style={styles.tipText}>• Select 6-11 players for optimal team size</Text>
            <Text style={styles.tipText}>• Mix experienced and new players</Text>
            <Text style={styles.tipText}>• Players will receive invitation notifications</Text>
            <Text style={styles.tipText}>• You'll be the team captain automatically</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E8',
  },
  keyboardContainer: {
    flex: 1,
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
  inputSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  selectedSection: {
    marginBottom: 20,
  },
  selectedPlayersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedPlayerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedPlayerName: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 6,
  },
  searchSection: {
    marginBottom: 20,
  },
  playersSection: {
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#666',
    marginTop: 12,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  selectedPlayerCard: {
    borderColor: '#FFD700',
    backgroundColor: '#2E7D32',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedAvatar: {
    backgroundColor: '#FFD700',
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  selectedText: {
    color: '#FFD700',
  },
  playerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  jerseyText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  matchesText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  selectionIndicator: {
    marginLeft: 12,
  },
  selectedIndicator: {
    // Additional styling if needed
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#666',
    marginTop: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginLeft: 8,
  },
  tipsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
});
