import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface User {
  id: string;
  name: string;
  email: string;
  jerseyNumber: string;
  profilePicture?: string;
}

interface Team {
  id: string;
  name: string;
  captainId: string;
  captainName: string;
  playerIds: string;
  playerNames: string;
}

interface MatchData {
  title: string;
  matchType: 'single' | 'series' | 'tournament' | 'league';
  overs: string;
  playersPerTeam: number;
  ballType: 'leather' | 'tennis';
  date: string;
  time: string;
  location: string;
  teamA: {
    name: string;
    players: User[];
  };
  teamB: {
    name: string;
    players: User[];
  };
}

export default function CreateMatchScreen() {
  const { db, user } = useBasic();
  const navigation = useNavigation<any>();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [matchData, setMatchData] = useState<MatchData>({
    title: '',
    matchType: 'single',
    overs: 'T20',
    playersPerTeam: 11,
    ballType: 'leather',
    date: '',
    time: '',
    location: '',
    teamA: { name: '', players: [] },
    teamB: { name: '', players: [] },
  });
  
  // UI states
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<'A' | 'B'>('A');
  const [showTossModal, setShowTossModal] = useState(false);
  const [tossResult, setTossResult] = useState<{ winner: 'A' | 'B'; decision: 'bat' | 'bowl' } | null>(null);
  
  // Animation refs
  const progressAnim = useRef(new Animated.Value(0)).current;
  const coinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchUsers();
    setDefaultValues();
  }, []);

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: (currentStep - 1) / 2, // 3 steps total
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const fetchUsers = async () => {
    try {
      const users = await db?.from('users').getAll();
      if (users) {
        setAllUsers(users as User[]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const setDefaultValues = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setMatchData(prev => ({
      ...prev,
      date: tomorrow.toISOString().split('T')[0],
      time: '15:00',
      teamA: { ...prev.teamA, name: `${user?.name || 'Captain'}'s Team` },
    }));
  };

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.jerseyNumber.includes(searchQuery)
  );

  const isPlayerSelected = (playerId: string) => {
    return matchData.teamA.players.some(p => p.id === playerId) ||
           matchData.teamB.players.some(p => p.id === playerId);
  };

  const addPlayerToTeam = (player: User, team: 'A' | 'B') => {
    if (isPlayerSelected(player.id)) {
      Alert.alert('Player Already Selected', 'This player is already in a team.');
      return;
    }

    const currentTeam = team === 'A' ? matchData.teamA : matchData.teamB;
    if (currentTeam.players.length >= matchData.playersPerTeam) {
      Alert.alert('Team Full', `Team ${team} already has ${matchData.playersPerTeam} players.`);
      return;
    }

    setMatchData(prev => ({
      ...prev,
      [team === 'A' ? 'teamA' : 'teamB']: {
        ...currentTeam,
        players: [...currentTeam.players, player]
      }
    }));
  };

  const removePlayerFromTeam = (playerId: string, team: 'A' | 'B') => {
    const currentTeam = team === 'A' ? matchData.teamA : matchData.teamB;
    setMatchData(prev => ({
      ...prev,
      [team === 'A' ? 'teamA' : 'teamB']: {
        ...currentTeam,
        players: currentTeam.players.filter(p => p.id !== playerId)
      }
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(matchData.title && matchData.date && matchData.time && matchData.location);
      case 2:
        return matchData.teamA.players.length === matchData.playersPerTeam &&
               matchData.teamB.players.length === matchData.playersPerTeam &&
               !!matchData.teamA.name && !!matchData.teamB.name;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    } else {
      Alert.alert('Incomplete Information', 'Please fill in all required fields before proceeding.');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const performCoinToss = () => {
    // Animate coin flip
    Animated.sequence([
      Animated.timing(coinAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      const winner = Math.random() > 0.5 ? 'A' : 'B';
      setTossResult({ winner, decision: 'bat' }); // Default to bat, user can change
    });
  };

  const createMatch = async (playNow: boolean = false) => {
    setLoading(true);
    try {
      const matchId = Date.now().toString();
      
      const newMatch = {
        id: matchId,
        title: matchData.title,
        matchType: matchData.matchType,
        overs: matchData.overs,
        playersPerTeam: matchData.playersPerTeam,
        ballType: matchData.ballType,
        date: matchData.date,
        time: matchData.time,
        venue: matchData.location,
        format: matchData.overs,
        status: playNow ? 'toss' : 'scheduled',
        teamAId: 'teamA_' + matchId,
        teamBId: 'teamB_' + matchId,
        teamAName: matchData.teamA.name,
        teamBName: matchData.teamB.name,
        teamAPlayers: JSON.stringify(matchData.teamA.players),
        teamBPlayers: JSON.stringify(matchData.teamB.players),
        tossWinner: tossResult?.winner || '',
        tossDecision: tossResult?.decision || '',
        battingTeam: tossResult?.decision === 'bat' ? 
          (tossResult.winner === 'A' ? matchData.teamA.name : matchData.teamB.name) : 
          (tossResult.winner === 'A' ? matchData.teamB.name : matchData.teamA.name),
        currentScore: '0/0',
        currentOvers: '0.0',
        createdAt: Date.now(),
        creatorId: user?.id || '',
      };

      await db?.from('matches').add(newMatch);

      // Create match chat
      const chatData = {
        matchId: matchId,
        participants: JSON.stringify([
          ...matchData.teamA.players.map(p => p.id),
          ...matchData.teamB.players.map(p => p.id)
        ]),
        createdAt: Date.now(),
        isActive: true,
      };

      // Send notifications to all players
      const allPlayers = [...matchData.teamA.players, ...matchData.teamB.players];
      for (const player of allPlayers) {
        const notification = {
          userId: player.id,
          title: '🏏 New Match Created!',
          message: `You've been selected for ${matchData.title}. ${matchData.teamA.name} vs ${matchData.teamB.name} on ${matchData.date} at ${matchData.time}`,
          type: 'match_invitation',
          read: false,
          matchId: matchId,
          createdAt: Date.now(),
        };
        await db?.from('notifications').add(notification);
      }

      if (playNow) {
        setShowTossModal(true);
      } else {
        Alert.alert(
          'Match Created! 🎉',
          `${matchData.title} has been scheduled successfully. All players have been notified.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error creating match:', error);
      Alert.alert('Error', 'Failed to create match. Please try again.');
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
      <View style={styles.stepIndicators}>
        {[1, 2, 3].map((step) => (
          <View
            key={step}
            style={[
              styles.stepIndicator,
              currentStep >= step && styles.activeStepIndicator
            ]}
          >
            <Text style={[
              styles.stepText,
              currentStep >= step && styles.activeStepText
            ]}>
              {step}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderStep1 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>🏏 Match Details</Text>
      
      {/* Match Title */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Match Title *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., Sunday League Match"
          value={matchData.title}
          onChangeText={(text) => setMatchData(prev => ({ ...prev, title: text }))}
        />
      </View>

      {/* Match Type */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Match Type</Text>
        <View style={styles.optionGrid}>
          {[
            { key: 'single', label: 'Single Match', icon: 'sports-cricket' },
            { key: 'series', label: 'Series', icon: 'view-list' },
            { key: 'tournament', label: 'Tournament', icon: 'emoji-events' },
            { key: 'league', label: 'League', icon: 'leaderboard' },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.optionCard,
                matchData.matchType === option.key && styles.selectedOption
              ]}
              onPress={() => setMatchData(prev => ({ ...prev, matchType: option.key as any }))}
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

      {/* Overs */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Match Format</Text>
        <View style={styles.chipContainer}>
          {['T10', 'T20', 'ODI', '5 Overs', '15 Overs', 'Custom'].map((format) => (
            <TouchableOpacity
              key={format}
              style={[
                styles.chip,
                matchData.overs === format && styles.selectedChip
              ]}
              onPress={() => setMatchData(prev => ({ ...prev, overs: format }))}
            >
              <Text style={[
                styles.chipText,
                matchData.overs === format && styles.selectedChipText
              ]}>
                {format}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Players per team */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Players per Team</Text>
        <View style={styles.chipContainer}>
          {[5, 7, 11].map((count) => (
            <TouchableOpacity
              key={count}
              style={[
                styles.chip,
                matchData.playersPerTeam === count && styles.selectedChip
              ]}
              onPress={() => setMatchData(prev => ({ ...prev, playersPerTeam: count }))}
            >
              <Text style={[
                styles.chipText,
                matchData.playersPerTeam === count && styles.selectedChipText
              ]}>
                {count} Players
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Ball Type */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Ball Type</Text>
        <View style={styles.chipContainer}>
          {[
            { key: 'leather', label: 'Leather Ball', icon: 'sports-cricket' },
            { key: 'tennis', label: 'Tennis Ball', icon: 'sports-tennis' },
          ].map((ball) => (
            <TouchableOpacity
              key={ball.key}
              style={[
                styles.ballOption,
                matchData.ballType === ball.key && styles.selectedChip
              ]}
              onPress={() => setMatchData(prev => ({ ...prev, ballType: ball.key as any }))}
            >
              <MaterialIcons 
                name={ball.icon as any} 
                size={20} 
                color={matchData.ballType === ball.key ? '#FFD700' : '#666'} 
              />
              <Text style={[
                styles.chipText,
                matchData.ballType === ball.key && styles.selectedChipText
              ]}>
                {ball.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Date & Time */}
      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.inputLabel}>Date *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="YYYY-MM-DD"
            value={matchData.date}
            onChangeText={(text) => setMatchData(prev => ({ ...prev, date: text }))}
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.inputLabel}>Time *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="HH:MM"
            value={matchData.time}
            onChangeText={(text) => setMatchData(prev => ({ ...prev, time: text }))}
          />
        </View>
      </View>

      {/* Location */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Match Location *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., Central Park Cricket Ground"
          value={matchData.location}
          onChangeText={(text) => setMatchData(prev => ({ ...prev, location: text }))}
        />
      </View>
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>👥 Team Setup</Text>
      
      {/* Team A */}
      <View style={styles.teamSection}>
        <View style={styles.teamHeader}>
          <Text style={styles.teamTitle}>Team A</Text>
          <Text style={styles.playerCount}>
            {matchData.teamA.players.length}/{matchData.playersPerTeam}
          </Text>
        </View>
        
        <TextInput
          style={styles.teamNameInput}
          placeholder="Team A Name"
          value={matchData.teamA.name}
          onChangeText={(text) => setMatchData(prev => ({
            ...prev,
            teamA: { ...prev.teamA, name: text }
          }))}
        />

        <View style={styles.playersContainer}>
          {matchData.teamA.players.map((player) => (
            <View key={player.id} style={styles.playerCard}>
              <View style={styles.playerInfo}>
                <MaterialIcons name="person" size={20} color="#2E7D32" />
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerJersey}>#{player.jerseyNumber}</Text>
              </View>
              <TouchableOpacity
                onPress={() => removePlayerFromTeam(player.id, 'A')}
                style={styles.removeButton}
              >
                <MaterialIcons name="close" size={16} color="#FF5722" />
              </TouchableOpacity>
            </View>
          ))}
          
          {matchData.teamA.players.length < matchData.playersPerTeam && (
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

      {/* VS Divider */}
      <View style={styles.vsContainer}>
        <Text style={styles.vsText}>VS</Text>
      </View>

      {/* Team B */}
      <View style={styles.teamSection}>
        <View style={styles.teamHeader}>
          <Text style={styles.teamTitle}>Team B</Text>
          <Text style={styles.playerCount}>
            {matchData.teamB.players.length}/{matchData.playersPerTeam}
          </Text>
        </View>
        
        <TextInput
          style={styles.teamNameInput}
          placeholder="Team B Name"
          value={matchData.teamB.name}
          onChangeText={(text) => setMatchData(prev => ({
            ...prev,
            teamB: { ...prev.teamB, name: text }
          }))}
        />

        <View style={styles.playersContainer}>
          {matchData.teamB.players.map((player) => (
            <View key={player.id} style={styles.playerCard}>
              <View style={styles.playerInfo}>
                <MaterialIcons name="person" size={20} color="#2E7D32" />
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerJersey}>#{player.jerseyNumber}</Text>
              </View>
              <TouchableOpacity
                onPress={() => removePlayerFromTeam(player.id, 'B')}
                style={styles.removeButton}
              >
                <MaterialIcons name="close" size={16} color="#FF5722" />
              </TouchableOpacity>
            </View>
          ))}
          
          {matchData.teamB.players.length < matchData.playersPerTeam && (
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
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>🚀 Match Start Mode</Text>
      
      <View style={styles.matchSummary}>
        <Text style={styles.summaryTitle}>{matchData.title}</Text>
        <Text style={styles.summarySubtitle}>
          {matchData.teamA.name} vs {matchData.teamB.name}
        </Text>
        <Text style={styles.summaryDetails}>
          📅 {matchData.date} at {matchData.time}
        </Text>
        <Text style={styles.summaryDetails}>
          📍 {matchData.location}
        </Text>
        <Text style={styles.summaryDetails}>
          🏏 {matchData.overs} • {matchData.playersPerTeam} players • {matchData.ballType} ball
        </Text>
      </View>

      <View style={styles.startOptions}>
        <TouchableOpacity
          style={styles.playNowButton}
          onPress={() => createMatch(true)}
          disabled={loading}
        >
          <MaterialIcons name="play-circle-filled" size={32} color="#1B5E20" />
          <Text style={styles.playNowText}>Play Now</Text>
          <Text style={styles.playNowSubtext}>Start with coin toss</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.scheduleButton}
          onPress={() => createMatch(false)}
          disabled={loading}
        >
          <MaterialIcons name="schedule" size={32} color="#FFD700" />
          <Text style={styles.scheduleText}>Schedule Match</Text>
          <Text style={styles.scheduleSubtext}>Notify players & start later</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderPlayerSearchModal = () => (
    <Modal
      visible={showPlayerSearch}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            Add Player to Team {selectedTeam}
          </Text>
          <TouchableOpacity onPress={() => setShowPlayerSearch(false)}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
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
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.playerSearchItem,
                isPlayerSelected(item.id) && styles.disabledPlayerItem
              ]}
              onPress={() => {
                if (!isPlayerSelected(item.id)) {
                  addPlayerToTeam(item, selectedTeam);
                  setShowPlayerSearch(false);
                  setSearchQuery('');
                }
              }}
              disabled={isPlayerSelected(item.id)}
            >
              <View style={styles.playerSearchInfo}>
                <MaterialIcons 
                  name="person" 
                  size={24} 
                  color={isPlayerSelected(item.id) ? '#999' : '#2E7D32'} 
                />
                <View style={styles.playerSearchDetails}>
                  <Text style={[
                    styles.playerSearchName,
                    isPlayerSelected(item.id) && styles.disabledText
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={[
                    styles.playerSearchJersey,
                    isPlayerSelected(item.id) && styles.disabledText
                  ]}>
                    Jersey #{item.jerseyNumber}
                  </Text>
                </View>
              </View>
              {isPlayerSelected(item.id) && (
                <Text style={styles.selectedLabel}>Selected</Text>
              )}
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </Modal>
  );

  const renderTossModal = () => (
    <Modal
      visible={showTossModal}
      animationType="fade"
      transparent
    >
      <View style={styles.tossModalOverlay}>
        <View style={styles.tossModalContent}>
          <Text style={styles.tossTitle}>🪙 Coin Toss</Text>
          
          <Animated.View
            style={[
              styles.coinContainer,
              {
                transform: [
                  {
                    rotateY: coinAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '1800deg'],
                    }),
                  },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            <MaterialIcons name="monetization-on" size={80} color="#FFD700" />
          </Animated.View>

          {!tossResult ? (
            <TouchableOpacity
              style={styles.tossButton}
              onPress={performCoinToss}
            >
              <Text style={styles.tossButtonText}>Flip Coin</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.tossResult}>
              <Text style={styles.tossWinnerText}>
                {tossResult.winner === 'A' ? matchData.teamA.name : matchData.teamB.name} wins the toss!
              </Text>
              
              <Text style={styles.tossDecisionLabel}>Choose to:</Text>
              <View style={styles.tossDecisionButtons}>
                <TouchableOpacity
                  style={[
                    styles.decisionButton,
                    tossResult.decision === 'bat' && styles.selectedDecision
                  ]}
                  onPress={() => setTossResult(prev => prev ? { ...prev, decision: 'bat' } : null)}
                >
                  <Text style={[
                    styles.decisionText,
                    tossResult.decision === 'bat' && styles.selectedDecisionText
                  ]}>
                    Bat First
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.decisionButton,
                    tossResult.decision === 'bowl' && styles.selectedDecision
                  ]}
                  onPress={() => setTossResult(prev => prev ? { ...prev, decision: 'bowl' } : null)}
                >
                  <Text style={[
                    styles.decisionText,
                    tossResult.decision === 'bowl' && styles.selectedDecisionText
                  ]}>
                    Bowl First
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.startMatchButton}
                onPress={() => {
                  setShowTossModal(false);
                  Alert.alert(
                    'Match Started! 🏏',
                    `${matchData.title} has begun! ${tossResult.winner === 'A' ? matchData.teamA.name : matchData.teamB.name} chose to ${tossResult.decision} first.`,
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                  );
                }}
              >
                <Text style={styles.startMatchText}>Start Match</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#2E7D32" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Match</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Step Content */}
        <View style={styles.content}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={prevStep}
            >
              <MaterialIcons name="arrow-back" size={20} color="#666" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          {currentStep < 3 && (
            <TouchableOpacity
              style={[
                styles.nextButton,
                !validateStep(currentStep) && styles.disabledButton
              ]}
              onPress={nextStep}
              disabled={!validateStep(currentStep)}
            >
              <Text style={styles.nextButtonText}>Next</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#1B5E20" />
            </TouchableOpacity>
          )}
        </View>

        {/* Modals */}
        {renderPlayerSearchModal()}
        {renderTossModal()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStepIndicator: {
    backgroundColor: '#4CAF50',
  },
  stepText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  activeStepText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  selectedOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedChip: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  selectedChipText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  ballOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  teamSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
  playerCount: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  teamNameInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  playersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 8,
    margin: 4,
    minWidth: '45%',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2E7D32',
    marginLeft: 6,
    flex: 1,
  },
  playerJersey: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  removeButton: {
    padding: 4,
  },
  addPlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    margin: 4,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  addPlayerText: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 6,
  },
  vsContainer: {
    alignItems: 'center',
    paddingVertical: 8,
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
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 8,
  },
  summarySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  summaryDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  startOptions: {
    gap: 16,
  },
  playNowButton: {
    backgroundColor: '#FFD700',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  playNowText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginTop: 8,
  },
  playNowSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scheduleButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  scheduleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 8,
  },
  scheduleSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginRight: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  searchContainer: {
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
    marginLeft: 8,
  },
  playerSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  disabledPlayerItem: {
    opacity: 0.5,
  },
  playerSearchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerSearchDetails: {
    marginLeft: 12,
    flex: 1,
  },
  playerSearchName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2E7D32',
  },
  playerSearchJersey: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  disabledText: {
    color: '#999',
  },
  selectedLabel: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  tossModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tossModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: SCREEN_WIDTH * 0.8,
  },
  tossTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 24,
  },
  coinContainer: {
    marginVertical: 24,
  },
  tossButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 16,
  },
  tossButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  tossResult: {
    alignItems: 'center',
    marginTop: 16,
  },
  tossWinnerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 16,
    textAlign: 'center',
  },
  tossDecisionLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  tossDecisionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  decisionButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedDecision: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  decisionText: {
    fontSize: 14,
    color: '#666',
  },
  selectedDecisionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  startMatchButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  startMatchText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
});