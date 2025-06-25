import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';
import { useNavigation, useRoute } from '@react-navigation/native';

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

export default function MatchDetailScreen() {
  const { db, user } = useBasic();
  const navigation = useNavigation();
  const route = useRoute();
  const { matchId } = route.params as { matchId: string };
  
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    fetchMatchDetails();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchMatchDetails = async () => {
    try {
      const fetchedMatch = await db?.from('matches').get(matchId);
      if (fetchedMatch) {
        setMatch(fetchedMatch as any);
      }
    } catch (error) {
      console.error('Error fetching match details:', error);
      Alert.alert('Error', 'Failed to load match details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatchDetails();
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'SCHEDULED';
      case 'live': return 'LIVE';
      case 'in_progress': return 'IN PROGRESS';
      case 'completed': return 'COMPLETED';
      default: return status.toUpperCase();
    }
  };

  const formatMatchDateTime = (date: string, time: string) => {
    const matchDate = new Date(`${date} ${time}`);
    return {
      date: matchDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: matchDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const handleStartToss = () => {
    (navigation as any).navigate('CoinToss', { matchId: match?.id });
  };

  const handleOpenChat = () => {
    (navigation as any).navigate('Chat', { matchId: match?.id });
  };

  const handleViewAnalytics = () => {
    (navigation as any).navigate('Analytics', { matchId: match?.id });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="sports-cricket" size={60} color="#FFD700" />
          <Text style={styles.loadingText}>Loading match details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!match) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={60} color="#FF5722" />
          <Text style={styles.errorText}>Match not found</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { date: formattedDate, time: formattedTime } = formatMatchDateTime(match.date, match.time);
  const statusColor = getStatusColor(match.status);
  const statusText = getStatusText(match.status);
  const isLive = match.status === 'live' || match.status === 'in_progress';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FFD700']}
            tintColor="#FFD700"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Match Header */}
          <View style={styles.matchHeader}>
            <View style={styles.headerTop}>
              <View style={styles.formatBadge}>
                <Text style={styles.formatText}>{match.format}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{statusText}</Text>
                {isLive && <View style={styles.liveDot} />}
              </View>
            </View>
          </View>

          {/* Teams Section */}
          <View style={styles.teamsSection}>
            <View style={styles.teamCard}>
              <MaterialIcons name="group" size={32} color="#2E7D32" />
              <Text style={styles.teamName}>{match.teamAName}</Text>
              {match.currentScore && match.battingTeam === match.teamAId && (
                <Text style={styles.teamScore}>{match.currentScore}</Text>
              )}
            </View>

            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={styles.teamCard}>
              <MaterialIcons name="group" size={32} color="#2E7D32" />
              <Text style={styles.teamName}>{match.teamBName}</Text>
              {match.currentScore && match.battingTeam === match.teamBId && (
                <Text style={styles.teamScore}>{match.currentScore}</Text>
              )}
            </View>
          </View>

          {/* Match Info */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Match Information</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <MaterialIcons name="calendar-today" size={20} color="#FFD700" />
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>{formattedDate}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialIcons name="access-time" size={20} color="#FFD700" />
                <Text style={styles.infoLabel}>Time:</Text>
                <Text style={styles.infoValue}>{formattedTime}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialIcons name="location-on" size={20} color="#FFD700" />
                <Text style={styles.infoLabel}>Venue:</Text>
                <Text style={styles.infoValue}>{match.venue}</Text>
              </View>
            </View>
          </View>

          {/* Toss Information */}
          {match.tossWinner ? (
            <View style={styles.tossSection}>
              <Text style={styles.sectionTitle}>Toss Result</Text>
              <View style={styles.tossCard}>
                <MaterialIcons name="monetization-on" size={24} color="#FFD700" />
                <Text style={styles.tossText}>
                  {match.tossWinner} won the toss and chose to {match.tossDecision}
                </Text>
              </View>
            </View>
          ) : match.status === 'scheduled' && (
            <View style={styles.tossSection}>
              <Text style={styles.sectionTitle}>Toss</Text>
              <TouchableOpacity style={styles.tossButton} onPress={handleStartToss}>
                <MaterialIcons name="monetization-on" size={24} color="#1B5E20" />
                <Text style={styles.tossButtonText}>Start Toss</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Live Score */}
          {isLive && match.currentScore && (
            <View style={styles.liveSection}>
              <Text style={styles.sectionTitle}>Live Score</Text>
              <View style={styles.liveCard}>
                <Text style={styles.liveScore}>{match.currentScore}</Text>
                <Text style={styles.liveOvers}>({match.currentOvers} overs)</Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Match Actions</Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={handleOpenChat}>
                <MaterialIcons name="chat" size={24} color="#FFD700" />
                <Text style={styles.actionButtonText}>Match Chat</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={handleViewAnalytics}>
                <MaterialIcons name="analytics" size={24} color="#FFD700" />
                <Text style={styles.actionButtonText}>Analytics</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="share" size={24} color="#FFD700" />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Match Timeline */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>Match Timeline</Text>
            <View style={styles.timelineCard}>
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <Text style={styles.timelineText}>Match scheduled</Text>
                <Text style={styles.timelineTime}>
                  {new Date(match.createdAt).toLocaleString()}
                </Text>
              </View>
              
              {match.tossWinner && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#FFD700' }]} />
                  <Text style={styles.timelineText}>Toss completed</Text>
                  <Text style={styles.timelineTime}>
                    {match.tossWinner} won toss
                  </Text>
                </View>
              )}
              
              {isLive && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.timelineText}>Match in progress</Text>
                  <Text style={styles.timelineTime}>Live now</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF5722',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  matchHeader: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formatBadge: {
    backgroundColor: '#2E7D32',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  formatText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginLeft: 6,
  },
  teamsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  teamCard: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  teamName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 8,
  },
  teamScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 4,
  },
  vsContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  vsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
    width: 60,
  },
  infoValue: {
    fontSize: 16,
    color: '#2E7D32',
    flex: 1,
    fontWeight: '500',
  },
  tossSection: {
    marginBottom: 20,
  },
  tossCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  tossText: {
    fontSize: 16,
    color: '#F57F17',
    marginLeft: 12,
    fontWeight: '500',
    flex: 1,
  },
  tossButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  tossButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginLeft: 8,
  },
  liveSection: {
    marginBottom: 20,
  },
  liveCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  liveScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  liveOvers: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionButtons: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#2E7D32',
    marginLeft: 12,
    fontWeight: '500',
  },
  timelineSection: {
    marginBottom: 20,
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2E7D32',
    marginRight: 12,
  },
  timelineText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2E7D32',
    flex: 1,
  },
  timelineTime: {
    fontSize: 12,
    color: '#666',
  },
});
