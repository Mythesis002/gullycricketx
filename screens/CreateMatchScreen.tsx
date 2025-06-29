import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Player {
  id: string;
  name: string;
  jerseyNumber: string;
  email: string;
  profilePicture?: string;
}

interface MatchData {
  title: string;
  matchType: 'single' | 'series' | 'tournament' | 'league';
  overs: string;
  playersPerTeam: number;
  ballType: 'leather' | 'tennis';
  date: string;
  time: string;
  venue: string;
  teamAName: string;
  teamBName: string;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
}

type Step = 'match-details' | 'team-setup' | 'match-start' | 'coin-toss';

export default function CreateMatchScreen() {
  const { db, user } = useBasic();
  const navigation = useNavigation<any>();
  
  // Core state
  const [currentStep, setCurrentStep] = useState<Step>('match-details');
  const [loading, setLoading] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  
  // Match data state
  const [matchData, setMatchData] = useState<MatchData>({
    title: '',
    matchType: 'single',
    overs: 'T20',
    playersPerTeam: 11,
    ballType: 'leather',
    date: new Date().toISOString().split('T')[0],
    time: '18:00',
    venue: '',
    teamAName: `${user?.name || 'Captain'}'s Team`,
    teamBName: '',
    teamAPlayers: [],
    teamBPlayers: [],
  });

  // UI state
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<'A' | 'B'>('A');
  const [showCoinToss, setShowCoinToss] = useState(false);
  const [tossResult, setTossResult] = useState<{
    winner: 'A' | 'B';
    decision?: 'bat' | 'bowl';
  } | null>(null);

  // Animations
  const progressAnim = useRef(new Animated.Value(0.25)).current;
  const coinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchAllPlayers();
  }, []);

  useEffect(() => {
    // Update progress animation based on current step
    const progressValues = {
      'match-details': 0.25,
      'team-setup': 0.5,
      'match-start': 0.75,
      'coin-toss': 1,
    };
    
    Animated.timing(progressAnim, {
      toValue: progressValues[currentStep],
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep, progressAnim]);

  const fetchAllPlayers = async () => {
    try {
      const users = await db?.from('users').getAll();
      if (users) {
        const players = (users as any[])
          .filter(u => u.id !== user?.id) // Exclude current user
          .map(u => ({
            id: u.id,
            name: u.name,
            jerseyNumber: u.jerseyNumber || '00',
            email: u.email,
            profilePicture: u.profilePicture,
          }));
        setAllPlayers(players);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const filteredPlayers = allPlayers.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         player.jerseyNumber.includes(searchQuery);
    const notInTeamA = !matchData.teamAPlayers.find(p => p.id === player.id);
    const notInTeamB = !matchData.teamBPlayers.find(p => p.id === player.id);
    return matchesSearch && notInTeamA && notInTeamB;
  });

  const updateMatchData = (updates: Partial<MatchData>) => {
    setMatchData(prev => ({ ...prev, ...updates }));
  };

  const addPlayerToTeam = (player: Player, team: 'A' | 'B') => {
    const teamKey = team === 'A' ? 'teamAPlayers' : 'teamBPlayers';
    const currentTeam = matchData[teamKey];
    
    if (currentTeam.length >= matchData.playersPerTeam) {
      Alert.alert('Team Full', `Team ${team} already has ${matchData.playersPerTeam} players.`);
      return;
    }

    updateMatchData({
      [teamKey]: [...currentTeam, player]
    });
    setShowPlayerSearch(false);
    setSearchQuery('');
  };

  const removePlayerFromTeam = (playerId: string, team: 'A' | 'B') => {
    const teamKey = team === 'A' ? 'teamAPlayers' : 'teamBPlayers';
    const currentTeam = matchData[teamKey];
    
    updateMatchData({
      [teamKey]: currentTeam.filter(p => p.id !== playerId)
    });
  };

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 'match-details':
        return !!(matchData.title && matchData.venue && matchData.teamBName);
      case 'team-setup':
        return matchData.teamAPlayers.length === matchData.playersPerTeam &&
               matchData.teamBPlayers.length === matchData.playersPerTeam;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) {
      Alert.alert('Incomplete', 'Please fill all required fields before proceeding.');
      return;
    }

    const steps: Step[] = ['match-details', 'team-setup', 'match-start'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['match-details', 'team-setup', 'match-start'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const startCoinToss = () => {
    setShowCoinToss(true);
    setCurrentStep('coin-toss');
    
    // Coin flip animation
    Animated.sequence([
      Animated.timing(coinAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Determine toss winner randomly
      const winner = Math.random() > 0.5 ? 'A' : 'B';
      setTossResult({ winner });
    });
  };

  const handleTossDecision = (decision: 'bat' | 'bowl') => {
    if (!tossResult) return;
    
    setTossResult({ ...tossResult, decision });
    createMatch();
  };

  const createMatch = async () => {
    if (!tossResult) return;
    
    setLoading(true);
    try {
      const matchToCreate = {
        title: matchData.title,
        matchType: matchData.matchType,
        overs: matchData.overs,
        playersPerTeam: matchData.playersPerTeam,
        ballType: matchData.ballType,
        date: matchData.date,
        time: matchData.time,
        venue: matchData.venue,
        teamAName: matchData.teamAName,
        teamBName: matchData.teamBName,
        teamAPlayers: JSON.stringify(matchData.teamAPlayers),
        teamBPlayers: JSON.stringify(matchData.teamBPlayers),
        teamAId: 'temp-a',
        teamBId: 'temp-b',
        status: 'live',
        tossWinner: tossResult.winner === 'A' ? matchData.teamAName : matchData.teamBName,
        tossDecision: tossResult.decision,
        battingTeam: tossResult.decision === 'bat' 
          ? (tossResult.winner === 'A' ? matchData.teamAName : matchData.teamBName)
          : (tossResult.winner === 'A' ? matchData.teamBName : matchData.teamAName),
        currentOvers: '0.0',
        currentScore: '0/0',
        format: matchData.overs,
        createdAt: Date.now(),
        creatorId: user?.id || '',
      };

      const createdMatch = await db?.from('matches').add(matchToCreate);
      
      if (createdMatch) {
        // Send notifications to all players
        await sendMatchNotifications(createdMatch.id as string);
        
        Alert.alert(
          'Match Created! 🏏',
          'All players have been notified. Good luck with your match!',
          [
            {
              text: 'View Match',
              onPress: () => {
                navigation.replace('MatchDetail', { matchId: createdMatch.id });
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error creating match:', error);
      Alert.alert('Error', 'Failed to create match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendMatchNotifications = async (matchId: string) => {
    const allMatchPlayers = [...matchData.teamAPlayers, ...matchData.teamBPlayers];
    
    for (const player of allMatchPlayers) {
      try {
        await db?.from('notifications').add({
          userId: player.id,
          type: 'match_invitation',
          title: '🏏 Match Invitation',
          message: `You've been selected for "${matchData.title}" at ${matchData.venue}`,
          read: false,
          createdAt: Date.now(),
        });
      } catch (error) {
        console.error('Error sending notification to player:', player.name, error);
      }
    }
  };

  const scheduleMatch = async () => {
    setLoading(true);
    try {
      const matchToCreate = {
        title: matchData.title,
        matchType: matchData.matchType,
        overs: matchData.overs,
        playersPerTeam: matchData.playersPerTeam,
        ballType: matchData.ballType,
        date: matchData.date,
        time: matchData.time,
        venue: matchData.venue,
        teamAName: matchData.teamAName,
        teamBName: matchData.teamBName,
        teamAPlayers: JSON.stringify(matchData.teamAPlayers),
        teamBPlayers: JSON.stringify(matchData.teamBPlayers),
        teamAId: 'temp-a',
        teamBId: 'temp-b',
        status: 'scheduled',
        tossWinner: '',
        tossDecision: '',
        battingTeam: '',
        currentOvers: '0.0',
        currentScore: '0/0',
        format: matchData.overs,
        createdAt: Date.now(),
        creatorId: user?.id || '',
      };

      const createdMatch = await db?.from('matches').add(matchToCreate);
      
      if (createdMatch) {
        await sendMatchNotifications(createdMatch.id as string);
        
        Alert.alert(
          'Match Scheduled! 📅',
          `Match scheduled for ${matchData.date} at ${matchData.time}. All players have been notified.`,
          [
            {
              text: 'View Matches',
              onPress: () => navigation.navigate('Matches')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error scheduling match:', error);
      Alert.alert('Error', 'Failed to schedule match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <Animated.View 
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              })
            }
          ]} 
        />
      </View>
      <Text style={styles.progressText}>
        Step {currentStep === 'match-details' ? '1' : currentStep === 'team-setup' ? '2' : '3'} of 3
      </Text>
    </View>
  );

  const renderMatchDetailsStep = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>🏏 Match Details</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Match Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Sunday Cricket Match"
          value={matchData.title}
          onChangeText={(text) => updateMatchData({ title: text })}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Match Type</Text>
        <View style={styles.optionGrid}>
          {[
            { key: 'single', label: 'Single Match', icon: 'sports-cricket' },
            { key: 'series', label: 'Series', icon: 'timeline' },
            { key: 'tournament', label: 'Tournament', icon: 'emoji-events' },
            { key: 'league', label: 'League', icon: 'groups' },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.optionCard,
                matchData.matchType === option.key && styles.selectedOption
              ]}
              onPress={() => updateMatchData({ matchType: option.key as any })}
            >
              <MaterialIcons 
                name={option.icon as any} 
                size={24} 
                color={matchData.matchType === option.key ? '#FFD700' : '#666'} 
              />
              <Text style={[
                styles.optionText,
                matchData.matchType === option.key && styles.selectedOptionText
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Overs</Text>
          <View style={styles.pickerContainer}>
            {['T10', 'T20', 'ODI', 'Custom'].map((over) => (
              <TouchableOpacity
                key={over}
                style={[
                  styles.pickerOption,
                  matchData.overs === over && styles.selectedPicker
                ]}
                onPress={() => updateMatchData({ overs: over })}
              >
                <Text style={[
                  styles.pickerText,
                  matchData.overs === over && styles.selectedPickerText
                ]}>
                  {over}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Players/Team</Text>
          <View style={styles.pickerContainer}>
            {[5, 7, 11].map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.pickerOption,
                  matchData.playersPerTeam === count && styles.selectedPicker
                ]}
                onPress={() => updateMatchData({ playersPerTeam: count })}
              >
                <Text style={[
                  styles.pickerText,
                  matchData.playersPerTeam === count && styles.selectedPickerText
                ]}>
                  {count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Ball Type</Text>
        <View style={styles.radioGroup}>
          {[
            { key: 'leather', label: 'Leather Ball', icon: 'sports-cricket' },
            { key: 'tennis', label: 'Tennis Ball', icon: 'sports-tennis' },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.radioOption,
                matchData.ballType === option.key && styles.selectedRadio
              ]}
              onPress={() => updateMatchData({ ballType: option.key as any })}
            >
              <MaterialIcons 
                name={option.icon as any} 
                size={20} 
                color={matchData.ballType === option.key ? '#FFD700' : '#666'} 
              />
              <Text style={[
                styles.radioText,
                matchData.ballType === option.key && styles.selectedRadioText
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            value={matchData.date}
            onChangeText={(text) => updateMatchData({ date: text })}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Time</Text>
          <TextInput
            style={styles.input}
            value={matchData.time}
            onChangeText={(text) => updateMatchData({ time: text })}
            placeholder="HH:MM"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Venue *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Central Park Cricket Ground"
          value={matchData.venue}
          onChangeText={(text) => updateMatchData({ venue: text })}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Team B Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter opponent team name"
          value={matchData.teamBName}
          onChangeText={(text) => updateMatchData({ teamBName: text })}
        />
      </View>
    </ScrollView>
  );

  const renderTeamSetupStep = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>👥 Team Setup</Text>
      
      <View style={styles.teamContainer}>
        <View style={styles.teamSection}>
          <View style={styles.teamHeader}>
            <Text style={styles.teamTitle}>Team A</Text>
            <Text style={styles.teamCount}>
              {matchData.teamAPlayers.length}/{matchData.playersPerTeam}
            </Text>
          </View>
          
          <TextInput
            style={styles.teamNameInput}
            value={matchData.teamAName}
            onChangeText={(text) => updateMatchData({ teamAName: text })}
            placeholder="Team A Name"
          />

          <View style={styles.playersContainer}>
            {matchData.teamAPlayers.map((player) => (
              <View key={player.id} style={styles.playerCard}>
                <View style={styles.playerInfo}>
                  <View style={styles.playerAvatar}>
                    <Text style={styles.playerInitial}>
                      {player.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerJersey}>#{player.jerseyNumber}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => removePlayerFromTeam(player.id, 'A')}
                  style={styles.removeButton}
                >
                  <MaterialIcons name="close" size={16} color="#FF5722" />
                </TouchableOpacity>
              </View>
            ))}
            
            {matchData.teamAPlayers.length < matchData.playersPerTeam && (
              <TouchableOpacity
                style={styles.addPlayerButton}
                onPress={() => {
                  setSelectedTeam('A');
                  setShowPlayerSearch(true);
                }}
              >
                <MaterialIcons name="add" size={24} color="#2E7D32" />
                <Text style={styles.addPlayerText}>Add Player</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={styles.teamSection}>
          <View style={styles.teamHeader}>
            <Text style={styles.teamTitle}>Team B</Text>
            <Text style={styles.teamCount}>
              {matchData.teamBPlayers.length}/{matchData.playersPerTeam}
            </Text>
          </View>
          
          <TextInput
            style={styles.teamNameInput}
            value={matchData.teamBName}
            onChangeText={(text) => updateMatchData({ teamBName: text })}
            placeholder="Team B Name *"
          />

          <View style={styles.playersContainer}>
            {matchData.teamBPlayers.map((player) => (
              <View key={player.id} style={styles.playerCard}>
                <View style={styles.playerInfo}>
                  <View style={styles.playerAvatar}>
                    <Text style={styles.playerInitial}>
                      {player.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerJersey}>#{player.jerseyNumber}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => removePlayerFromTeam(player.id, 'B')}
                  style={styles.removeButton}
                >
                  <MaterialIcons name="close" size={16} color="#FF5722" />
                </TouchableOpacity>
              </View>
            ))}
            
            {matchData.teamBPlayers.length < matchData.playersPerTeam && (
              <TouchableOpacity
                style={styles.addPlayerButton}
                onPress={() => {
                  setSelectedTeam('B');
                  setShowPlayerSearch(true);
                }}
              >
                <MaterialIcons name="add" size={24} color="#2E7D32" />
                <Text style={styles.addPlayerText}>Add Player</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderMatchStartStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>🚀 Ready to Start?</Text>
      
      <View style={styles.matchSummary}>
        <Text style={styles.summaryTitle}>{matchData.title}</Text>
        <Text style={styles.summarySubtitle}>
          {matchData.overs} • {matchData.playersPerTeam}v{matchData.playersPerTeam} • {matchData.ballType} ball
        </Text>
        <Text style={styles.summaryVenue}>📍 {matchData.venue}</Text>
        <Text style={styles.summaryDateTime}>
          📅 {matchData.date} at {matchData.time}
        </Text>
        
        <View style={styles.teamsPreview}>
          <View style={styles.teamPreview}>
            <Text style={styles.teamPreviewName}>{matchData.teamAName}</Text>
            <Text style={styles.teamPreviewCount}>
              {matchData.teamAPlayers.length} players
            </Text>
          </View>
          <Text style={styles.vsPreview}>VS</Text>
          <View style={styles.teamPreview}>
            <Text style={styles.teamPreviewName}>{matchData.teamBName}</Text>
            <Text style={styles.teamPreviewCount}>
              {matchData.teamBPlayers.length} players
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.startOptions}>
        <TouchableOpacity
          style={styles.playNowButton}
          onPress={startCoinToss}
          disabled={loading}
        >
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            style={styles.gradientButton}
          >
            <MaterialIcons name="play-arrow" size={24} color="#FFFFFF" />
            <Text style={styles.playNowText}>Play Now</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.scheduleButton}
          onPress={scheduleMatch}
          disabled={loading}
        >
          <MaterialIcons name="schedule" size={24} color="#2E7D32" />
          <Text style={styles.scheduleText}>Schedule for Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCoinToss = () => (
    <Modal visible={showCoinToss} animationType="fade" transparent>
      <View style={styles.coinTossOverlay}>
        <View style={styles.coinTossContainer}>
          <Text style={styles.coinTossTitle}>Coin Toss</Text>
          
          {!tossResult ? (
            <View style={styles.coinContainer}>
              <Animated.View
                style={[
                  styles.coin,
                  {
                    transform: [
                      {
                        rotateY: coinAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '1800deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.coinText}>🪙</Text>
              </Animated.View>
              <Text style={styles.coinTossSubtitle}>Flipping...</Text>
            </View>
          ) : (
            <View style={styles.tossResultContainer}>
              <Text style={styles.tossWinnerText}>
                {tossResult.winner === 'A' ? matchData.teamAName : matchData.teamBName} wins the toss!
              </Text>
              
              {!tossResult.decision && (
                <View style={styles.tossDecisionContainer}>
                  <Text style={styles.tossDecisionTitle}>Choose to:</Text>
                  <View style={styles.tossButtons}>
                    <TouchableOpacity
                      style={styles.tossButton}
                      onPress={() => handleTossDecision('bat')}
                    >
                      <MaterialIcons name="sports-cricket" size={32} color="#FFD700" />
                      <Text style={styles.tossButtonText}>Bat First</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.tossButton}
                      onPress={() => handleTossDecision('bowl')}
                    >
                      <MaterialIcons name="sports-baseball" size={32} color="#FFD700" />
                      <Text style={styles.tossButtonText}>Bowl First</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
          
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFD700" />
              <Text style={styles.loadingText}>Creating match...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderPlayerSearchModal = () => (
    <Modal visible={showPlayerSearch} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.playerSearchContainer}>
          <View style={styles.searchHeader}>
            <Text style={styles.searchTitle}>
              Add Player to Team {selectedTeam}
            </Text>
            <TouchableOpacity
              onPress={() => setShowPlayerSearch(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or jersey number..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredPlayers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.playerSearchItem}
                onPress={() => addPlayerToTeam(item, selectedTeam)}
              >
                <View style={styles.playerSearchInfo}>
                  <View style={styles.playerSearchAvatar}>
                    <Text style={styles.playerSearchInitial}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.playerSearchName}>{item.name}</Text>
                    <Text style={styles.playerSearchJersey}>#{item.jerseyNumber}</Text>
                  </View>
                </View>
                <MaterialIcons name="add-circle" size={24} color="#4CAF50" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptySearch}>
                <MaterialIcons name="search-off" size={48} color="#999" />
                <Text style={styles.emptySearchText}>No players found</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E8F5E8', '#F1F8E9']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#2E7D32" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Match</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Step Content */}
        <View style={styles.content}>
          {currentStep === 'match-details' && renderMatchDetailsStep()}
          {currentStep === 'team-setup' && renderTeamSetupStep()}
          {currentStep === 'match-start' && renderMatchStartStep()}
        </View>

        {/* Navigation Buttons */}
        {currentStep !== 'match-start' && (
          <View style={styles.navigationButtons}>
            {currentStep !== 'match-details' && (
              <TouchableOpacity
                style={styles.backStepButton}
                onPress={prevStep}
              >
                <MaterialIcons name="arrow-back" size={20} color="#666" />
                <Text style={styles.backStepText}>Back</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.nextStepButton,
                !validateStep(currentStep) && styles.disabledButton
              ]}
              onPress={nextStep}
              disabled={!validateStep(currentStep)}
            >
              <Text style={styles.nextStepText}>Next</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Modals */}
        {renderPlayerSearchModal()}
        {renderCoinToss()}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 24,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  pickerContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
  },
  pickerOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedPicker: {
    backgroundColor: '#4CAF50',
  },
  pickerText: {
    fontSize: 14,
    color: '#666',
  },
  selectedPickerText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
  },
  selectedRadio: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  radioText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  selectedRadioText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  teamContainer: {
    flex: 1,
  },
  teamSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  teamCount: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  teamNameInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 16,
  },
  playersContainer: {
    minHeight: 100,
  },
  playerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerInitial: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  playerJersey: {
    fontSize: 12,
    color: '#666',
  },
  removeButton: {
    padding: 4,
  },
  addPlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F8E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
  },
  addPlayerText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
    marginLeft: 8,
  },
  vsContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  vsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  matchSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 8,
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  summaryVenue: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  summaryDateTime: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  teamsPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamPreview: {
    flex: 1,
    alignItems: 'center',
  },
  teamPreviewName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  teamPreviewCount: {
    fontSize: 12,
    color: '#666',
  },
  vsPreview: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginHorizontal: 16,
  },
  startOptions: {
    gap: 16,
  },
  playNowButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  playNowText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  scheduleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 8,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  backStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backStepText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  nextStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  nextStepText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  playerSearchContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
    paddingBottom: 34,
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  closeButton: {
    padding: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  playerSearchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  playerSearchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerSearchAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerSearchInitial: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  playerSearchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  playerSearchJersey: {
    fontSize: 14,
    color: '#666',
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySearchText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  coinTossOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinTossContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: 300,
  },
  coinTossTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 32,
  },
  coinContainer: {
    alignItems: 'center',
  },
  coin: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  coinText: {
    fontSize: 60,
  },
  coinTossSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  tossResultContainer: {
    alignItems: 'center',
  },
  tossWinnerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 24,
  },
  tossDecisionContainer: {
    alignItems: 'center',
  },
  tossDecisionTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  tossButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  tossButton: {
    alignItems: 'center',
    backgroundColor: '#F1F8E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    minWidth: 100,
  },
  tossButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});