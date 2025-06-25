import React, { useState, useEffect } from 'react';
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
}

export default function CreateMatchScreen() {
  const { db, user } = useBasic();
  const navigation = useNavigation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamA, setSelectedTeamA] = useState<Team | null>(null);
  const [selectedTeamB, setSelectedTeamB] = useState<Team | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [format, setFormat] = useState('T20');
  const [creating, setCreating] = useState(false);
  const [showTeamAList, setShowTeamAList] = useState(false);
  const [showTeamBList, setShowTeamBList] = useState(false);

  useEffect(() => {
    fetchTeams();
    // Set default date to today
    const today = new Date();
    setDate(today.toISOString().split('T')[0]);
  }, []);

  const fetchTeams = async () => {
    try {
      const fetchedTeams = await db?.from('teams').getAll();
      if (fetchedTeams) {
        setTeams(fetchedTeams as any[]);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      Alert.alert('Error', 'Failed to load teams');
    }
  };

  const handleCreateMatch = async () => {
    if (!selectedTeamA || !selectedTeamB) {
      Alert.alert('Error', 'Please select both teams.');
      return;
    }

    if (selectedTeamA.id === selectedTeamB.id) {
      Alert.alert('Error', 'Please select different teams.');
      return;
    }

    if (!date || !time || !venue.trim()) {
      Alert.alert('Error', 'Please fill in all match details.');
      return;
    }

    setCreating(true);

    try {
      const matchData = {
        teamAId: selectedTeamA.id,
        teamBId: selectedTeamB.id,
        teamAName: selectedTeamA.name,
        teamBName: selectedTeamB.name,
        date: date,
        time: time,
        venue: venue.trim(),
        format: format,
        status: 'scheduled',
        tossWinner: '',
        tossDecision: '',
        currentScore: '',
        currentOvers: '',
        battingTeam: '',
        createdAt: Date.now(),
      };

      await db?.from('matches').add(matchData);

      // Send notifications to both team captains
      const notifications = [
        {
          userId: selectedTeamA.captainId,
          title: 'New Match Scheduled! 🏏',
          message: `Match between ${selectedTeamA.name} vs ${selectedTeamB.name} scheduled for ${date} at ${time}. Venue: ${venue}`,
          type: 'match_created',
          read: false,
          createdAt: Date.now(),
        },
        {
          userId: selectedTeamB.captainId,
          title: 'New Match Scheduled! 🏏',
          message: `Match between ${selectedTeamA.name} vs ${selectedTeamB.name} scheduled for ${date} at ${time}. Venue: ${venue}`,
          type: 'match_created',
          read: false,
          createdAt: Date.now(),
        }
      ];

      for (const notification of notifications) {
        await db?.from('notifications').add(notification);
      }

      Alert.alert(
        'Success! 🎉',
        `Match scheduled successfully between ${selectedTeamA.name} and ${selectedTeamB.name}!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating match:', error);
      Alert.alert('Error', 'Failed to schedule match. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const renderTeamSelector = (
    title: string,
    selectedTeam: Team | null,
    showList: boolean,
    setShowList: (show: boolean) => void,
    onSelectTeam: (team: Team) => void
  ) => (
    <View style={styles.selectorContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity
        style={styles.teamSelector}
        onPress={() => setShowList(!showList)}
      >
        <View style={styles.teamSelectorContent}>
          {selectedTeam ? (
            <>
              <MaterialIcons name="group" size={20} color="#2E7D32" />
              <Text style={styles.selectedTeamText}>{selectedTeam.name}</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="add" size={20} color="#666" />
              <Text style={styles.placeholderText}>Select Team</Text>
            </>
          )}
        </View>
        <MaterialIcons 
          name={showList ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
          size={24} 
          color="#666" 
        />
      </TouchableOpacity>

      {showList && (
        <View style={styles.teamList}>
          {teams.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={styles.teamOption}
              onPress={() => {
                onSelectTeam(team);
                setShowList(false);
              }}
            >
              <MaterialIcons name="group" size={20} color="#2E7D32" />
              <View style={styles.teamOptionInfo}>
                <Text style={styles.teamOptionName}>{team.name}</Text>
                <Text style={styles.teamOptionCaptain}>Captain: {team.captainName}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const formatOptions = ['T20', 'ODI', '10 Overs', '15 Overs', 'Custom'];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons name="sports-cricket" size={24} color="#FFD700" />
            <Text style={styles.headerTitle}>Schedule Cricket Match</Text>
          </View>

          {/* Team Selection */}
          {renderTeamSelector(
            'Team A',
            selectedTeamA,
            showTeamAList,
            setShowTeamAList,
            setSelectedTeamA
          )}

          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {renderTeamSelector(
            'Team B',
            selectedTeamB,
            showTeamBList,
            setShowTeamBList,
            setSelectedTeamB
          )}

          {/* Match Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Match Details</Text>
            
            {/* Date */}
            <View style={styles.inputContainer}>
              <MaterialIcons name="calendar-today" size={20} color="#FFD700" />
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                value={date}
                onChangeText={setDate}
              />
            </View>

            {/* Time */}
            <View style={styles.inputContainer}>
              <MaterialIcons name="access-time" size={20} color="#FFD700" />
              <TextInput
                style={styles.textInput}
                placeholder="HH:MM (e.g., 14:30)"
                placeholderTextColor="#999"
                value={time}
                onChangeText={setTime}
              />
            </View>

            {/* Venue */}
            <View style={styles.inputContainer}>
              <MaterialIcons name="location-on" size={20} color="#FFD700" />
              <TextInput
                style={styles.textInput}
                placeholder="Match venue (e.g., Central Park Ground)"
                placeholderTextColor="#999"
                value={venue}
                onChangeText={setVenue}
                maxLength={100}
              />
            </View>

            {/* Format Selection */}
            <View style={styles.formatSection}>
              <Text style={styles.formatTitle}>Match Format</Text>
              <View style={styles.formatOptions}>
                {formatOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.formatOption,
                      format === option && styles.selectedFormat
                    ]}
                    onPress={() => setFormat(option)}
                  >
                    <Text style={[
                      styles.formatOptionText,
                      format === option && styles.selectedFormatText
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              { opacity: (!selectedTeamA || !selectedTeamB || !date || !time || !venue.trim() || creating) ? 0.5 : 1 }
            ]}
            onPress={handleCreateMatch}
            disabled={!selectedTeamA || !selectedTeamB || !date || !time || !venue.trim() || creating}
          >
            <MaterialIcons 
              name={creating ? "hourglass-empty" : "sports-cricket"} 
              size={24} 
              color="#1B5E20" 
            />
            <Text style={styles.createButtonText}>
              {creating ? 'Scheduling...' : 'Schedule Match'}
            </Text>
          </TouchableOpacity>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Match Scheduling Tips:</Text>
            <Text style={styles.tipText}>• Choose teams with active players</Text>
            <Text style={styles.tipText}>• Schedule at least 24 hours in advance</Text>
            <Text style={styles.tipText}>• Confirm venue availability</Text>
            <Text style={styles.tipText}>• Both team captains will be notified</Text>
            <Text style={styles.tipText}>• Match can be updated before start time</Text>
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
  selectorContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  teamSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  teamSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedTeamText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    marginLeft: 8,
  },
  teamList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    maxHeight: 200,
  },
  teamOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  teamOptionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  teamOptionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  teamOptionCaptain: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  vsContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  vsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  detailsSection: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  formatSection: {
    marginTop: 8,
  },
  formatTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  formatOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formatOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  selectedFormat: {
    backgroundColor: '#2E7D32',
    borderColor: '#FFD700',
  },
  formatOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedFormatText: {
    color: '#FFD700',
    fontWeight: 'bold',
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
