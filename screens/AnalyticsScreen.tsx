import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';
import { useRoute, useNavigation } from '@react-navigation/native';

interface MatchAnalytic {
  id: string;
  matchId: string;
  playerId: string;
  playerName: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  wickets: number;
  oversBowled: number;
  runsConceded: number;
  status: string;
  captainAApproval: boolean;
  captainBApproval: boolean;
  createdAt: number;
}

export default function AnalyticsScreen() {
  const { db, user } = useBasic();
  const navigation = useNavigation();
  const route = useRoute();
  const { matchId } = route.params as { matchId: string };
  
  const [runs, setRuns] = useState('');
  const [ballsFaced, setBallsFaced] = useState('');
  const [fours, setFours] = useState('');
  const [sixes, setSixes] = useState('');
  const [wickets, setWickets] = useState('');
  const [oversBowled, setOversBowled] = useState('');
  const [runsConceded, setRunsConceded] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingAnalytics, setExistingAnalytics] = useState<MatchAnalytic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExistingAnalytics();
  }, []);

  const fetchExistingAnalytics = async () => {
    try {
      const analytics = await db?.from('matchAnalytics').getAll();
      if (analytics) {
        const userAnalytic = (analytics as any[]).find(
          a => a.matchId === matchId && a.playerId === user?.id
        );
        
        if (userAnalytic) {
          setExistingAnalytics(userAnalytic);
          // Pre-fill form with existing data
          setRuns(userAnalytic.runs.toString());
          setBallsFaced(userAnalytic.ballsFaced.toString());
          setFours(userAnalytic.fours.toString());
          setSixes(userAnalytic.sixes.toString());
          setWickets(userAnalytic.wickets.toString());
          setOversBowled(userAnalytic.oversBowled.toString());
          setRunsConceded(userAnalytic.runsConceded.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateInputs = () => {
    const runsNum = parseInt(runs) || 0;
    const ballsNum = parseInt(ballsFaced) || 0;
    const foursNum = parseInt(fours) || 0;
    const sixesNum = parseInt(sixes) || 0;
    const wicketsNum = parseInt(wickets) || 0;
    const oversNum = parseFloat(oversBowled) || 0;
    const concededNum = parseInt(runsConceded) || 0;

    if (runsNum < 0 || ballsNum < 0 || foursNum < 0 || sixesNum < 0 || 
        wicketsNum < 0 || oversNum < 0 || concededNum < 0) {
      Alert.alert('Error', 'All values must be positive numbers.');
      return false;
    }

    if (foursNum * 4 + sixesNum * 6 > runsNum) {
      Alert.alert('Error', 'Fours and sixes cannot exceed total runs.');
      return false;
    }

    if (ballsNum > 0 && foursNum + sixesNum > ballsNum) {
      Alert.alert('Error', 'Fours and sixes cannot exceed balls faced.');
      return false;
    }

    return true;
  };

  const handleSubmitAnalytics = async () => {
    if (!validateInputs()) {
      return;
    }

    setSubmitting(true);

    try {
      // Get current user profile
      const users = await db?.from('users').getAll();
      const currentUser = users?.find(u => u.email === user?.email);

      const analyticsData = {
        matchId: matchId,
        playerId: user?.id || '',
        playerName: currentUser?.name || user?.name || 'Unknown Player',
        runs: parseInt(runs) || 0,
        ballsFaced: parseInt(ballsFaced) || 0,
        fours: parseInt(fours) || 0,
        sixes: parseInt(sixes) || 0,
        wickets: parseInt(wickets) || 0,
        oversBowled: parseFloat(oversBowled) || 0,
        runsConceded: parseInt(runsConceded) || 0,
        status: 'pending',
        captainAApproval: false,
        captainBApproval: false,
        createdAt: Date.now(),
      };

      if (existingAnalytics) {
        // Update existing analytics
        await db?.from('matchAnalytics').update(existingAnalytics.id, analyticsData);
      } else {
        // Create new analytics
        await db?.from('matchAnalytics').add(analyticsData);
      }

      // Get match details to notify captains
      const match = await db?.from('matches').get(matchId);
      if (match) {
        const notifications = [
          {
            userId: match.teamAId, // Assuming this is captain ID
            title: 'Performance Verification Needed 📊',
            message: `${currentUser?.name} has submitted match performance data. Please review and approve.`,
            type: 'performance_update',
            read: false,
            createdAt: Date.now(),
          },
          {
            userId: match.teamBId, // Assuming this is captain ID
            title: 'Performance Verification Needed 📊',
            message: `${currentUser?.name} has submitted match performance data. Please review and approve.`,
            type: 'performance_update',
            read: false,
            createdAt: Date.now(),
          }
        ];

        for (const notification of notifications) {
          await db?.from('notifications').add(notification);
        }
      }

      Alert.alert(
        'Success! 🎉',
        existingAnalytics 
          ? 'Performance data updated successfully! Captains will be notified for verification.'
          : 'Performance data submitted successfully! Captains will be notified for verification.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error submitting analytics:', error);
      Alert.alert('Error', 'Failed to submit performance data. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateStats = () => {
    const runsNum = parseInt(runs) || 0;
    const ballsNum = parseInt(ballsFaced) || 0;
    const wicketsNum = parseInt(wickets) || 0;
    const oversNum = parseFloat(oversBowled) || 0;
    const concededNum = parseInt(runsConceded) || 0;

    const strikeRate = ballsNum > 0 ? ((runsNum / ballsNum) * 100).toFixed(1) : '0.0';
    const bowlingAverage = wicketsNum > 0 ? (concededNum / wicketsNum).toFixed(1) : '0.0';
    const economyRate = oversNum > 0 ? (concededNum / oversNum).toFixed(1) : '0.0';

    return { strikeRate, bowlingAverage, economyRate };
  };

  const { strikeRate, bowlingAverage, economyRate } = calculateStats();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="analytics" size={60} color="#FFD700" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons name="analytics" size={24} color="#FFD700" />
            <Text style={styles.headerTitle}>
              {existingAnalytics ? 'Update Performance' : 'Submit Performance'}
            </Text>
          </View>

          {existingAnalytics && (
            <View style={styles.statusCard}>
              <MaterialIcons 
                name={existingAnalytics.status === 'approved' ? 'check-circle' : 'pending'} 
                size={20} 
                color={existingAnalytics.status === 'approved' ? '#4CAF50' : '#FF9800'} 
              />
              <Text style={styles.statusText}>
                Status: {existingAnalytics.status === 'approved' ? 'Approved' : 'Pending Verification'}
              </Text>
            </View>
          )}

          {/* Batting Performance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏏 Batting Performance</Text>
            
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <MaterialIcons name="trending-up" size={20} color="#FFD700" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Runs"
                  placeholderTextColor="#999"
                  value={runs}
                  onChangeText={setRuns}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <MaterialIcons name="sports-cricket" size={20} color="#FFD700" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Balls Faced"
                  placeholderTextColor="#999"
                  value={ballsFaced}
                  onChangeText={setBallsFaced}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>4s</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Fours"
                  placeholderTextColor="#999"
                  value={fours}
                  onChangeText={setFours}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>6s</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Sixes"
                  placeholderTextColor="#999"
                  value={sixes}
                  onChangeText={setSixes}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Batting Stats */}
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Batting Stats</Text>
              <Text style={styles.statText}>Strike Rate: {strikeRate}%</Text>
            </View>
          </View>

          {/* Bowling Performance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Bowling Performance</Text>
            
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <MaterialIcons name="whatshot" size={20} color="#FFD700" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Wickets"
                  placeholderTextColor="#999"
                  value={wickets}
                  onChangeText={setWickets}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <MaterialIcons name="timer" size={20} color="#FFD700" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Overs (e.g., 4.2)"
                  placeholderTextColor="#999"
                  value={oversBowled}
                  onChangeText={setOversBowled}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="trending-down" size={20} color="#FFD700" />
              <TextInput
                style={styles.textInput}
                placeholder="Runs Conceded"
                placeholderTextColor="#999"
                value={runsConceded}
                onChangeText={setRunsConceded}
                keyboardType="numeric"
              />
            </View>

            {/* Bowling Stats */}
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Bowling Stats</Text>
              <Text style={styles.statText}>Bowling Average: {bowlingAverage}</Text>
              <Text style={styles.statText}>Economy Rate: {economyRate}</Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { opacity: submitting ? 0.5 : 1 }
            ]}
            onPress={handleSubmitAnalytics}
            disabled={submitting}
          >
            <MaterialIcons 
              name={submitting ? "hourglass-empty" : "send"} 
              size={24} 
              color="#1B5E20" 
            />
            <Text style={styles.submitButtonText}>
              {submitting 
                ? 'Submitting...' 
                : existingAnalytics 
                  ? 'Update Performance' 
                  : 'Submit Performance'
              }
            </Text>
          </TouchableOpacity>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Performance Tips:</Text>
            <Text style={styles.tipText}>• Be honest with your performance data</Text>
            <Text style={styles.tipText}>• Both team captains must verify your stats</Text>
            <Text style={styles.tipText}>• Approved stats will update your profile</Text>
            <Text style={styles.tipText}>• You can update data before verification</Text>
            <Text style={styles.tipText}>• Accurate data helps track your progress</Text>
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
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  statusText: {
    fontSize: 14,
    color: '#F57F17',
    marginLeft: 8,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    flex: 1,
    marginHorizontal: 4,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 24,
    textAlign: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  statsCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  submitButton: {
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
  submitButtonText: {
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
