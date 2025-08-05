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
  Modal,
  TextInput,
  Picker,
  Switch,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';
import TeamsScreen from './TeamsScreen';

interface Tournament {
  id: string;
  name: string;
  creatorId: string;
  format: string;
  teamIds: string;
  matchIds: string;
  standings: string;
  status: string;
  createdAt: number;
}

export default function TournamentScreen() {
  const { db, user } = useBasic();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');
  const fadeAnim = new Animated.Value(0);

  // Tournament creation modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    format: 'Knockout',
    overs: 6,
    maxTeams: 4,
    autoApproval: false,
  });

  // Team join modal state
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joiningTournament, setJoiningTournament] = useState(null);
  const [userTeams, setUserTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [joining, setJoining] = useState(false);

  const [organizerTab, setOrganizerTab] = useState(false);
  const [organizerTournaments, setOrganizerTournaments] = useState([]);
  const [teamRequests, setTeamRequests] = useState({}); // { tournamentId: [teams] }
  const [approvedTeams, setApprovedTeams] = useState({}); // { tournamentId: [teams] }
  const [generatingFixtures, setGeneratingFixtures] = useState(false);
  const [tournamentMatches, setTournamentMatches] = useState({}); // { tournamentId: [matches] }
  const [scoringModal, setScoringModal] = useState({ visible: false, match: null });
  const [scoreForm, setScoreForm] = useState({ runsA: '', runsB: '', wicketsA: '', wicketsB: '', oversA: '', oversB: '', winner: '' });

  const [publicTab, setPublicTab] = useState(null); // For public tournament view
  const [publicTournaments, setPublicTournaments] = useState([]);
  const [publicMatches, setPublicMatches] = useState({});
  const [publicTeams, setPublicTeams] = useState({});
  const [playerStatsModal, setPlayerStatsModal] = useState({ visible: false, match: null });
  const [playerStatsForm, setPlayerStatsForm] = useState({});
  const [liveScoringModal, setLiveScoringModal] = useState({ visible: false, match: null });
  const [liveScoringForm, setLiveScoringForm] = useState({ striker: '', nonStriker: '', bowler: '', runs: '', extras: '', wicket: false, wicketType: '', fielder: '' });
  const [scorecardTab, setScorecardTab] = useState('batting');
  const [scorecardData, setScorecardData] = useState({ batting: [], bowling: [], fow: [], balls: [] });
  const [statApprovalModal, setStatApprovalModal] = useState({ visible: false, match: null });

  useEffect(() => {
    fetchTournaments();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchTournaments = async () => {
    try {
      const fetchedTournaments = await db?.from('tournaments').getAll();
      if (fetchedTournaments) {
        const sortedTournaments = (fetchedTournaments as any[]).sort((a, b) => b.createdAt - a.createdAt);
        setTournaments(sortedTournaments);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      Alert.alert('Error', 'Failed to load tournaments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTournaments();
  };

  const getFilteredTournaments = () => {
    return tournaments.filter(tournament => {
      switch (activeTab) {
        case 'active':
          return tournament.status === 'active' || tournament.status === 'in_progress';
        case 'upcoming':
          return tournament.status === 'upcoming' || tournament.status === 'registration_open';
        case 'completed':
          return tournament.status === 'completed';
        default:
          return true;
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'in_progress':
        return '#4CAF50';
      case 'upcoming':
      case 'registration_open':
        return '#2196F3';
      case 'completed':
        return '#9E9E9E';
      default:
        return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'ACTIVE';
      case 'in_progress':
        return 'IN PROGRESS';
      case 'upcoming':
        return 'UPCOMING';
      case 'registration_open':
        return 'REGISTRATION OPEN';
      case 'completed':
        return 'COMPLETED';
      default:
        return status.toUpperCase();
    }
  };

  const getTeamCount = (teamIds: string) => {
    try {
      return JSON.parse(teamIds).length;
    } catch {
      return 0;
    }
  };

  const getMatchCount = (matchIds: string) => {
    try {
      return JSON.parse(matchIds).length;
    } catch {
      return 0;
    }
  };

  // Fetch user's teams (with 11 players)
  const fetchUserTeams = async () => {
    try {
              const { data, error } = await db?.from('teams').select('id, name, logo, players').eq('is_deleted', false);
      if (error) throw error;
      // Only teams managed by user and with 11 players
      const teams = (data || []).filter(t => t.manager_id === user?.id && t.players && JSON.parse(t.players).length === 11);
      setUserTeams(teams);
    } catch (e) {
      setUserTeams([]);
    }
  };

  // Open join modal for a tournament
  const openJoinModal = (tournament) => {
    setJoiningTournament(tournament);
    setSelectedTeamId(null);
    fetchUserTeams();
    setJoinModalVisible(true);
  };

  // Join tournament logic
  const handleJoinTournament = async () => {
    if (!selectedTeamId) {
      Alert.alert('Select Team', 'Please select a team to join.');
      return;
    }
    setJoining(true);
    try {
      const { error } = await db?.from('tournament_teams').insert({
        tournament_id: joiningTournament.id,
        team_id: selectedTeamId,
        status: joiningTournament.auto_approval ? 'approved' : 'requested',
        entry_fee_paid: true,
      });
      if (error) throw error;
      setJoinModalVisible(false);
      setJoiningTournament(null);
      setSelectedTeamId(null);
      fetchTournaments();
      Alert.alert('Success', 'Team join request sent!');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to join tournament');
    } finally {
      setJoining(false);
    }
  };

  // Fetch tournaments organized by user
  const fetchOrganizerTournaments = async () => {
    try {
      const { data, error } = await db?.from('tournaments').select('*').eq('organizer_id', user?.id);
      if (error) throw error;
      setOrganizerTournaments(data || []);
      // For each tournament, fetch team requests
      const requests = {};
      const approved = {};
      for (const t of data || []) {
        const { data: teams } = await db?.from('tournament_teams').select('*, teams(name)').eq('tournament_id', t.id);
        requests[t.id] = (teams || []).filter(tr => tr.status === 'requested');
        approved[t.id] = (teams || []).filter(tr => tr.status === 'approved');
      }
      setTeamRequests(requests);
      setApprovedTeams(approved);
    } catch (e) {
      setOrganizerTournaments([]);
      setTeamRequests({});
      setApprovedTeams({});
    }
  };

  // Approve/Reject team
  const handleTeamApproval = async (tournamentId, teamId, approve) => {
    try {
      const { error } = await db?.from('tournament_teams').update({ status: approve ? 'approved' : 'rejected' }).eq('tournament_id', tournamentId).eq('team_id', teamId);
      if (error) throw error;
      fetchOrganizerTournaments();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update team status');
    }
  };

  // Generate fixtures (simple knockout)
  const handleGenerateFixtures = async (tournament) => {
    setGeneratingFixtures(true);
    try {
      const teams = approvedTeams[tournament.id] || [];
      if (teams.length < 2) throw new Error('At least 2 teams required');
      // Shuffle teams
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      const matches = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          matches.push({
            tournament_id: tournament.id,
            round: 1,
            match_no: i / 2 + 1,
            team_a_id: shuffled[i].team_id,
            team_b_id: shuffled[i + 1].team_id,
            status: 'scheduled',
          });
        } else {
          // Odd team out gets a bye (optional: handle as needed)
        }
      }
      // Insert matches
      for (const m of matches) {
        await db?.from('tournament_matches').insert(m);
      }
      Alert.alert('Fixtures Generated', `${matches.length} matches created!`);
      fetchOrganizerTournaments();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to generate fixtures');
    } finally {
      setGeneratingFixtures(false);
    }
  };

  // Organizer tab toggle
  const showOrganizerTab = organizerTournaments.length > 0;

  useEffect(() => {
    fetchOrganizerTournaments();
  }, []);

  // Fetch matches for all tournaments
  const fetchTournamentMatches = async () => {
    try {
      const matchesByTournament = {};
      for (const t of organizerTournaments) {
        const { data: matches } = await db?.from('tournament_matches').select('*, team_a:teams!team_a_id(name), team_b:teams!team_b_id(name)').eq('tournament_id', t.id);
        matchesByTournament[t.id] = matches || [];
      }
      setTournamentMatches(matchesByTournament);
    } catch (e) {
      setTournamentMatches({});
    }
  };

  useEffect(() => {
    fetchTournamentMatches();
  }, [organizerTournaments]);

  // Start match
  const handleStartMatch = async (matchId) => {
    try {
      await db?.from('tournament_matches').update({ status: 'live' }).eq('id', matchId);
      fetchTournamentMatches();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to start match');
    }
  };

  // Open scoring modal
  const openScoringModal = (match) => {
    setScoreForm({ runsA: '', runsB: '', wicketsA: '', wicketsB: '', oversA: '', oversB: '', winner: '' });
    setScoringModal({ visible: true, match });
  };

  // Submit score
  const handleSubmitScore = async () => {
    const { match } = scoringModal;
    if (!scoreForm.runsA || !scoreForm.runsB || !scoreForm.winner) {
      Alert.alert('Error', 'Fill all required fields');
      return;
    }
    try {
      await db?.from('tournament_matches').update({
        status: 'completed',
        winner_id: scoreForm.winner,
        runs_a: Number(scoreForm.runsA),
        runs_b: Number(scoreForm.runsB),
        wickets_a: Number(scoreForm.wicketsA),
        wickets_b: Number(scoreForm.wicketsB),
        overs_a: Number(scoreForm.oversA),
        overs_b: Number(scoreForm.oversB),
      }).eq('id', match.id);
      setScoringModal({ visible: false, match: null });
      fetchTournamentMatches();
      fetchOrganizerTournaments();
      // Auto-advance knockout
      const tournament = organizerTournaments.find(t => t.id === match.tournament_id);
      if (tournament?.format === 'knockout') {
        await autoAdvanceKnockout(match.tournament_id);
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to submit score');
    }
  };

  // Points Table (for league)
  const getPointsTable = (matches, teams) => {
    const table = {};
    teams.forEach(t => {
      table[t.team_id] = { name: t.teams?.name || 'Team', played: 0, won: 0, lost: 0, points: 0 };
    });
    matches.forEach(m => {
      if (m.status === 'completed') {
        table[m.team_a_id].played++;
        table[m.team_b_id].played++;
        if (m.winner_id === m.team_a_id) {
          table[m.team_a_id].won++;
          table[m.team_b_id].lost++;
          table[m.team_a_id].points += 2;
        } else if (m.winner_id === m.team_b_id) {
          table[m.team_b_id].won++;
          table[m.team_a_id].lost++;
          table[m.team_b_id].points += 2;
        }
      }
    });
    return Object.values(table).sort((a, b) => b.points - a.points);
  };

  // Knockout progression (show bracket, auto-advance)
  const getKnockoutRounds = (matches) => {
    const rounds = {};
    matches.forEach(m => {
      if (!rounds[m.round]) rounds[m.round] = [];
      rounds[m.round].push(m);
    });
    return rounds;
  };

  // Fetch all published tournaments for public view
  const fetchPublicTournaments = async () => {
    try {
      const { data, error } = await db?.from('tournaments').select('*').eq('status', 'published');
      if (error) throw error;
      setPublicTournaments(data || []);
      // Fetch matches and teams for each tournament
      const matchesByTournament = {};
      const teamsByTournament = {};
      for (const t of data || []) {
        const { data: matches } = await db?.from('tournament_matches').select('*, team_a:teams!team_a_id(name), team_b:teams!team_b_id(name)').eq('tournament_id', t.id);
        matchesByTournament[t.id] = matches || [];
        const { data: teams } = await db?.from('tournament_teams').select('*, teams(name)').eq('tournament_id', t.id).eq('status', 'approved');
        teamsByTournament[t.id] = teams || [];
      }
      setPublicMatches(matchesByTournament);
      setPublicTeams(teamsByTournament);
    } catch (e) {
      setPublicTournaments([]);
      setPublicMatches({});
      setPublicTeams({});
    }
  };

  useEffect(() => {
    fetchPublicTournaments();
  }, []);

  // Auto-advance knockout winners
  const autoAdvanceKnockout = async (tournamentId) => {
    const matches = tournamentMatches[tournamentId] || [];
    const rounds = {};
    matches.forEach(m => {
      if (!rounds[m.round]) rounds[m.round] = [];
      rounds[m.round].push(m);
    });
    // Find latest completed round
    const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
    const lastRound = roundNumbers[roundNumbers.length - 1];
    const lastMatches = rounds[lastRound] || [];
    // If all matches in last round are completed and next round doesn't exist
    if (lastMatches.every(m => m.status === 'completed') && !rounds[lastRound + 1]) {
      const winners = lastMatches.map(m => m.winner_id).filter(Boolean);
      if (winners.length < 2) {
        // Declare tournament winner
        await db?.from('tournaments').update({ status: 'completed' }).eq('id', tournamentId);
        Alert.alert('Tournament Completed', 'Winner declared!');
        fetchOrganizerTournaments();
        fetchTournamentMatches();
        return;
      }
      // Pair winners for next round
      const shuffled = [...winners].sort(() => Math.random() - 0.5);
      const nextMatches = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          nextMatches.push({
            tournament_id: tournamentId,
            round: lastRound + 1,
            match_no: i / 2 + 1,
            team_a_id: shuffled[i],
            team_b_id: shuffled[i + 1],
            status: 'scheduled',
          });
        } else {
          // Odd team out gets a bye
        }
      }
      for (const m of nextMatches) {
        await db?.from('tournament_matches').insert(m);
      }
      fetchTournamentMatches();
      Alert.alert('Next Round Generated', `${nextMatches.length} matches created!`);
    }
  };

  // Fetch match_performances and ball_by_ball for a match
  const fetchScorecardData = async (matchId) => {
    const { data: batting } = await db?.from('match_performances').select('*').eq('match_id', matchId).order('batting_position');
    const { data: bowling } = await db?.from('match_performances').select('*').eq('match_id', matchId).order('bowling_position');
    const { data: balls } = await db?.from('ball_by_ball').select('*').eq('match_id', matchId).order('over,ball');
    // Calculate FOW from balls
    const fow = balls.filter(b => b.wicket).map(b => ({ over: b.over, ball: b.ball, batsman: b.batsman_id, score: b.runs }));
    setScorecardData({ batting: batting || [], bowling: bowling || [], fow, balls: balls || [] });
  };

  // Open live scoring modal
  const openLiveScoringModal = (match) => {
    setLiveScoringForm({ striker: '', nonStriker: '', bowler: '', runs: '', extras: '', wicket: false, wicketType: '', fielder: '' });
    setLiveScoringModal({ visible: true, match });
  };

  // Submit ball-by-ball entry
  const handleSubmitBall = async () => {
    const { match } = liveScoringModal;
    // Save ball to ball_by_ball
    await db?.from('ball_by_ball').insert({
      match_id: match.id,
      over: scorecardData.balls.length ? scorecardData.balls[scorecardData.balls.length-1].over + (scorecardData.balls[scorecardData.balls.length-1].ball === 6 ? 1 : 0) : 1,
      ball: scorecardData.balls.length ? (scorecardData.balls[scorecardData.balls.length-1].ball % 6) + 1 : 1,
      batsman_id: liveScoringForm.striker,
      bowler_id: liveScoringForm.bowler,
      runs: Number(liveScoringForm.runs),
      extras: Number(liveScoringForm.extras),
      wicket: liveScoringForm.wicket,
      wicket_type: liveScoringForm.wicketType,
      fielder_id: liveScoringForm.fielder,
    });
    // Update match_performances for batsman, bowler, fielder
    // (You can expand this logic for full stat calculation)
    fetchScorecardData(match.id);
    setLiveScoringForm({ striker: '', nonStriker: '', bowler: '', runs: '', extras: '', wicket: false, wicketType: '', fielder: '' });
  };

  // Scorecard tab UI
  // Add a tab bar for 'Batting', 'Bowling', 'FOW', 'Ball-by-Ball'
  // Show tables for each using scorecardData

  // Stat approval modal
  const openStatApprovalModal = (match) => {
    setStatApprovalModal({ visible: true, match });
  };
  const handleApproveStats = async () => {
    const { match } = statApprovalModal;
    await db?.from('match_performances').update({ status: 'confirmed' }).eq('match_id', match.id);
    setStatApprovalModal({ visible: false, match: null });
    fetchScorecardData(match.id);
  };

  const renderTournament = ({ item }: { item: Tournament }) => {
    const statusColor = getStatusColor(item.status);
    const statusText = getStatusText(item.status);
    const teamCount = getTeamCount(item.teamIds);
    const matchCount = getMatchCount(item.matchIds);
    
    // Check if user is a team manager and not already joined
    const [alreadyJoined, setAlreadyJoined] = useState(false);
    useEffect(() => {
      const checkJoined = async () => {
        const { data } = await db?.from('tournament_teams').select('id').eq('tournament_id', item.id).eq('team_id', user?.team_id).maybeSingle();
        setAlreadyJoined(!!data);
      };
      checkJoined();
    }, [item.id]);

    return (
      <Animated.View style={[styles.tournamentCard, { opacity: fadeAnim }]}>
        <View style={styles.tournamentHeader}>
          <View style={styles.tournamentInfo}>
            <Text style={styles.tournamentName}>{item.name}</Text>
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>{item.format}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.tournamentStats}>
          <View style={styles.statItem}>
            <MaterialIcons name="group" size={20} color="#4CAF50" />
            <Text style={styles.statText}>{teamCount} Teams</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="sports-cricket" size={20} color="#4CAF50" />
            <Text style={styles.statText}>{matchCount} Matches</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="calendar-today" size={20} color="#4CAF50" />
            <Text style={styles.statText}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.tournamentActions}>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="visibility" size={20} color="#2E7D32" />
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="leaderboard" size={20} color="#2E7D32" />
            <Text style={styles.actionButtonText}>Standings</Text>
          </TouchableOpacity>
          
          {item.status === 'registration_open' && (
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="how-to-reg" size={20} color="#2E7D32" />
              <Text style={styles.actionButtonText}>Register</Text>
            </TouchableOpacity>
          )}
          {item.status === 'published' && !alreadyJoined && (
            <TouchableOpacity style={styles.actionButton} onPress={() => openJoinModal(item)}>
              <MaterialIcons name="how-to-reg" size={20} color="#2E7D32" />
              <Text style={styles.actionButtonText}>Join</Text>
            </TouchableOpacity>
          )}
          {alreadyJoined && (
            <View style={styles.actionButton}>
              <MaterialIcons name="check-circle" size={20} color="#2E7D32" />
              <Text style={styles.actionButtonText}>Requested</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="emoji-events" size={80} color="#FFD700" />
      <Text style={styles.emptyTitle}>
        No {activeTab} tournaments
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'active' 
          ? 'No tournaments are currently active'
          : activeTab === 'upcoming'
            ? 'No upcoming tournaments scheduled'
            : 'No completed tournaments found'
        }
      </Text>
      
      <View style={styles.tournamentFeatures}>
        <Text style={styles.featuresTitle}>🏆 Tournament Features:</Text>
        <Text style={styles.featureText}>• Knockout and Round-Robin formats</Text>
        <Text style={styles.featureText}>• Real-time standings and statistics</Text>
        <Text style={styles.featureText}>• Multi-team competitions</Text>
        <Text style={styles.featureText}>• Automated match scheduling</Text>
        <Text style={styles.featureText}>• Winner celebrations and badges</Text>
      </View>
    </View>
  );

  const handleCreateTournament = async () => {
    if (!form.name || !form.format || !form.overs || !form.maxTeams) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setCreating(true);
    try {
      const { error } = await db?.from('tournaments').insert({
        name: form.name,
        format: form.format.toLowerCase(),
        overs_per_match: Number(form.overs),
        max_teams: Number(form.maxTeams),
        status: 'published',
        organizer_id: user?.id,
        auto_approval: form.autoApproval,
      });
      if (error) throw error;
      setModalVisible(false);
      setForm({ name: '', format: 'Knockout', overs: 6, maxTeams: 4, autoApproval: false });
      fetchTournaments();
      Alert.alert('Success', 'Tournament created!');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create tournament');
    } finally {
      setCreating(false);
    }
  };

  const filteredTournaments = getFilteredTournaments();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="emoji-events" size={60} color="#FFD700" />
          <Text style={styles.loadingText}>Loading tournaments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <MaterialIcons 
            name="play-circle-filled" 
            size={18} 
            color={activeTab === 'active' ? '#1B5E20' : '#666'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'active' && styles.activeTabText
          ]}>
            Active
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <MaterialIcons 
            name="schedule" 
            size={18} 
            color={activeTab === 'upcoming' ? '#1B5E20' : '#666'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'upcoming' && styles.activeTabText
          ]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <MaterialIcons 
            name="emoji-events" 
            size={18} 
            color={activeTab === 'completed' ? '#1B5E20' : '#666'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'completed' && styles.activeTabText
          ]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {showOrganizerTab && (
        <View style={{ margin: 16, borderRadius: 12, backgroundColor: '#fff', padding: 12, borderWidth: 2, borderColor: '#FFD700' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#2E7D32', marginBottom: 8 }}>Organizer Dashboard</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {organizerTournaments.map(t => (
              <TouchableOpacity key={t.id} style={{ marginRight: 12, padding: 8, backgroundColor: '#E8F5E8', borderRadius: 8 }} onPress={() => setOrganizerTab(t.id)}>
                <Text style={{ fontWeight: 'bold', color: organizerTab === t.id ? '#FFD700' : '#2E7D32' }}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {organizerTab && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: 'bold', color: '#2E7D32', marginBottom: 4 }}>Team Requests</Text>
              {(teamRequests[organizerTab] || []).map(tr => (
                <View key={tr.team_id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, backgroundColor: '#FFFDE7', borderRadius: 8, padding: 8 }}>
                  <Text style={{ flex: 1 }}>{tr.teams?.name || 'Team'}</Text>
                  <TouchableOpacity onPress={() => handleTeamApproval(organizerTab, tr.team_id, true)} style={{ marginRight: 8, backgroundColor: '#4CAF50', borderRadius: 6, padding: 6 }}>
                    <Text style={{ color: '#fff' }}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleTeamApproval(organizerTab, tr.team_id, false)} style={{ backgroundColor: '#E53935', borderRadius: 6, padding: 6 }}>
                    <Text style={{ color: '#fff' }}>Reject</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <Text style={{ fontWeight: 'bold', color: '#2E7D32', marginTop: 12 }}>Approved Teams: {(approvedTeams[organizerTab] || []).length}</Text>
              {(approvedTeams[organizerTab] || []).map(tr => (
                <Text key={tr.team_id} style={{ marginLeft: 8, color: '#388E3C' }}>{tr.teams?.name || 'Team'}</Text>
              ))}
              {(approvedTeams[organizerTab] || []).length >= 2 && (
                <TouchableOpacity onPress={() => handleGenerateFixtures(organizerTournaments.find(t => t.id === organizerTab))} style={{ marginTop: 16, backgroundColor: '#FFD700', borderRadius: 8, padding: 12, alignItems: 'center' }} disabled={generatingFixtures}>
                  <Text style={{ color: '#2E7D32', fontWeight: 'bold' }}>{generatingFixtures ? 'Generating...' : 'Generate Fixtures'}</Text>
                </TouchableOpacity>
              )}
              <Text style={{ fontWeight: 'bold', color: '#2E7D32', marginTop: 16 }}>Fixtures/Matches</Text>
              {(tournamentMatches[organizerTab] || []).map(m => (
                <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, backgroundColor: '#E3F2FD', borderRadius: 8, padding: 8 }}>
                  <Text style={{ flex: 2 }}>{m.team_a?.name} vs {m.team_b?.name} (Round {m.round})</Text>
                  <Text style={{ flex: 1, color: m.status === 'completed' ? '#388E3C' : '#666' }}>{m.status.toUpperCase()}</Text>
                  {m.status === 'scheduled' && (
                    <TouchableOpacity onPress={() => handleStartMatch(m.id)} style={{ marginLeft: 8, backgroundColor: '#FFD700', borderRadius: 6, padding: 6 }}>
                      <Text style={{ color: '#2E7D32' }}>Start</Text>
                    </TouchableOpacity>
                  )}
                  {m.status === 'live' && (
                    <TouchableOpacity onPress={() => openScoringModal(m)} style={{ marginLeft: 8, backgroundColor: '#4CAF50', borderRadius: 6, padding: 6 }}>
                      <Text style={{ color: '#fff' }}>Enter Score</Text>
                    </TouchableOpacity>
                  )}
                  {m.status === 'completed' && (
                    <Text style={{ marginLeft: 8, color: '#388E3C' }}>Winner: {m.winner_id === m.team_a_id ? m.team_a?.name : m.team_b?.name}</Text>
                  )}
                </View>
              ))}
              {/* Points Table for League */}
              {organizerTournaments.find(t => t.id === organizerTab)?.format === 'league' && (
                <View style={{ marginTop: 16, backgroundColor: '#fff', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#4CAF50' }}>
                  <Text style={{ fontWeight: 'bold', color: '#2E7D32', marginBottom: 4 }}>Points Table</Text>
                  {getPointsTable(tournamentMatches[organizerTab] || [], approvedTeams[organizerTab] || []).map((row, idx) => (
                    <View key={row.name} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                      <Text>{idx + 1}. {row.name}</Text>
                      <Text>P:{row.played} W:{row.won} L:{row.lost} Pts:{row.points}</Text>
                    </View>
                  ))}
                </View>
              )}
              {/* Knockout Bracket */}
              {organizerTournaments.find(t => t.id === organizerTab)?.format === 'knockout' && (
                <View style={{ marginTop: 16, backgroundColor: '#fff', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#FFD700' }}>
                  <Text style={{ fontWeight: 'bold', color: '#2E7D32', marginBottom: 4 }}>Knockout Bracket</Text>
                  {Object.entries(getKnockoutRounds(tournamentMatches[organizerTab] || [])).map(([round, matches]) => (
                    <View key={round} style={{ marginBottom: 8 }}>
                      <Text style={{ fontWeight: 'bold', color: '#388E3C' }}>Round {round}</Text>
                      {matches.map(m => (
                        <Text key={m.id} style={{ marginLeft: 8 }}>{m.team_a?.name} vs {m.team_b?.name} - {m.status.toUpperCase()} {m.status === 'completed' ? `(Winner: ${m.winner_id === m.team_a_id ? m.team_a?.name : m.team_b?.name})` : ''}</Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      <FlatList
        data={filteredTournaments}
        renderItem={renderTournament}
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
          filteredTournaments.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <MaterialIcons name="add" size={28} color="#1B5E20" />
      </TouchableOpacity>
      {/* Tournament Creation Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Create Tournament</Text>
            <TextInput placeholder="Tournament Name" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} style={{ borderBottomWidth: 1, marginBottom: 12 }} />
            <Text>Format</Text>
            <Picker selectedValue={form.format} onValueChange={v => setForm(f => ({ ...f, format: v }))} style={{ marginBottom: 12 }}>
              <Picker.Item label="Knockout" value="Knockout" />
              <Picker.Item label="League" value="League" />
              <Picker.Item label="Round Robin" value="Round Robin" />
            </Picker>
            <Text>Overs per Match</Text>
            <Picker selectedValue={form.overs} onValueChange={v => setForm(f => ({ ...f, overs: v }))} style={{ marginBottom: 12 }}>
              <Picker.Item label="6" value={6} />
              <Picker.Item label="8" value={8} />
              <Picker.Item label="10" value={10} />
              <Picker.Item label="20" value={20} />
            </Picker>
            <TextInput placeholder="Max Teams Allowed" value={String(form.maxTeams)} onChangeText={v => setForm(f => ({ ...f, maxTeams: v.replace(/\D/g, '') }))} keyboardType="numeric" style={{ borderBottomWidth: 1, marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text>Auto-approve Teams</Text>
              <Switch value={form.autoApproval} onValueChange={v => setForm(f => ({ ...f, autoApproval: v }))} style={{ marginLeft: 8 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 10 }}>
                <Text style={{ color: '#888' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateTournament} style={{ backgroundColor: '#4CAF50', borderRadius: 8, padding: 10, minWidth: 80, alignItems: 'center' }} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Team Join Modal */}
      <Modal visible={joinModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Join Tournament</Text>
            <Text>Select your team (must have 11 players):</Text>
            <FlatList
              data={userTeams}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: selectedTeamId === item.id ? '#E8F5E8' : '#fff', borderRadius: 8, marginVertical: 4 }}
                  onPress={() => setSelectedTeamId(item.id)}
                >
                  <Text style={{ fontWeight: 'bold', marginRight: 8 }}>{item.name}</Text>
                  {selectedTeamId === item.id && <MaterialIcons name="check" size={20} color="#4CAF50" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ color: '#888', marginTop: 12 }}>No eligible teams found.</Text>}
              style={{ maxHeight: 200, marginVertical: 12 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity onPress={() => setJoinModalVisible(false)} style={{ padding: 10 }}>
                <Text style={{ color: '#888' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleJoinTournament} style={{ backgroundColor: '#4CAF50', borderRadius: 8, padding: 10, minWidth: 80, alignItems: 'center' }} disabled={joining}>
                {joining ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Join</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Scoring Modal */}
      <Modal visible={scoringModal.visible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Enter Match Score</Text>
            <Text>{scoringModal.match?.team_a?.name} vs {scoringModal.match?.team_b?.name}</Text>
            <TextInput placeholder="Runs (A)" value={scoreForm.runsA} onChangeText={v => setScoreForm(f => ({ ...f, runsA: v.replace(/\D/g, '') }))} keyboardType="numeric" style={{ borderBottomWidth: 1, marginBottom: 8 }} />
            <TextInput placeholder="Wickets (A)" value={scoreForm.wicketsA} onChangeText={v => setScoreForm(f => ({ ...f, wicketsA: v.replace(/\D/g, '') }))} keyboardType="numeric" style={{ borderBottomWidth: 1, marginBottom: 8 }} />
            <TextInput placeholder="Overs (A)" value={scoreForm.oversA} onChangeText={v => setScoreForm(f => ({ ...f, oversA: v.replace(/[^\d.]/g, '') }))} keyboardType="numeric" style={{ borderBottomWidth: 1, marginBottom: 8 }} />
            <TextInput placeholder="Runs (B)" value={scoreForm.runsB} onChangeText={v => setScoreForm(f => ({ ...f, runsB: v.replace(/\D/g, '') }))} keyboardType="numeric" style={{ borderBottomWidth: 1, marginBottom: 8 }} />
            <TextInput placeholder="Wickets (B)" value={scoreForm.wicketsB} onChangeText={v => setScoreForm(f => ({ ...f, wicketsB: v.replace(/\D/g, '') }))} keyboardType="numeric" style={{ borderBottomWidth: 1, marginBottom: 8 }} />
            <TextInput placeholder="Overs (B)" value={scoreForm.oversB} onChangeText={v => setScoreForm(f => ({ ...f, oversB: v.replace(/[^\d.]/g, '') }))} keyboardType="numeric" style={{ borderBottomWidth: 1, marginBottom: 8 }} />
            <Text>Winner</Text>
            <Picker selectedValue={scoreForm.winner} onValueChange={v => setScoreForm(f => ({ ...f, winner: v }))} style={{ marginBottom: 12 }}>
              <Picker.Item label={scoringModal.match?.team_a?.name || 'Team A'} value={scoringModal.match?.team_a_id} />
              <Picker.Item label={scoringModal.match?.team_b?.name || 'Team B'} value={scoringModal.match?.team_b_id} />
            </Picker>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity onPress={() => setScoringModal({ visible: false, match: null })} style={{ padding: 10 }}>
                <Text style={{ color: '#888' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmitScore} style={{ backgroundColor: '#4CAF50', borderRadius: 8, padding: 10, minWidth: 80, alignItems: 'center' } }>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Player stats modal */}
      <Modal visible={playerStatsModal.visible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Enter Player Stats</Text>
            {/* For each player in both teams, show fields for runs, wickets, etc. */}
            {/* Example: */}
            {/* <Text>Player Name</Text>
            <TextInput placeholder="Runs" ... />
            <TextInput placeholder="Wickets" ... /> */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity onPress={() => setPlayerStatsModal({ visible: false, match: null })} style={{ padding: 10 }}>
                <Text style={{ color: '#888' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmitPlayerStats} style={{ backgroundColor: '#4CAF50', borderRadius: 8, padding: 10, minWidth: 80, alignItems: 'center' } }>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Live Scoring Modal */}
      <Modal visible={liveScoringModal.visible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Live Scoring</Text>
            <Text>Match: {liveScoringModal.match?.team_a?.name} vs {liveScoringModal.match?.team_b?.name}</Text>
            <Text style={{ marginBottom: 12 }}>Current Batsman: {liveScoringForm.striker || 'N/A'}</Text>
            <Text style={{ marginBottom: 12 }}>Current Bowler: {liveScoringForm.bowler || 'N/A'}</Text>
            <TextInput placeholder="Runs" value={liveScoringForm.runs} onChangeText={v => setLiveScoringForm(f => ({ ...f, runs: v }))} keyboardType="numeric" style={{ borderBottomWidth: 1, marginBottom: 8 }} />
            <TextInput placeholder="Extras" value={liveScoringForm.extras} onChangeText={v => setLiveScoringForm(f => ({ ...f, extras: v }))} keyboardType="numeric" style={{ borderBottomWidth: 1, marginBottom: 8 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text>Wicket: </Text>
              <Switch value={liveScoringForm.wicket} onValueChange={v => setLiveScoringForm(f => ({ ...f, wicket: v }))} />
            </View>
            {liveScoringForm.wicket && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text>Type: </Text>
                <Picker selectedValue={liveScoringForm.wicketType} onValueChange={v => setLiveScoringForm(f => ({ ...f, wicketType: v }))} style={{ marginLeft: 8 }}>
                  <Picker.Item label="Caught" value="caught" />
                  <Picker.Item label="Bowled" value="bowled" />
                  <Picker.Item label="Stumped" value="stumped" />
                  <Picker.Item label="Run Out" value="run_out" />
                  <Picker.Item label="Hit Wicket" value="hit_wicket" />
                  <Picker.Item label="Obstructing the Field" value="obstructing_field" />
                </Picker>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text>Fielder: </Text>
              <Picker selectedValue={liveScoringForm.fielder} onValueChange={v => setLiveScoringForm(f => ({ ...f, fielder: v }))} style={{ marginLeft: 8 }}>
                <Picker.Item label="N/A" value="" />
                {/* Add other fielder options if needed */}
              </Picker>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity onPress={() => setLiveScoringModal({ visible: false, match: null })} style={{ padding: 10 }}>
                <Text style={{ color: '#888' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmitBall} style={{ backgroundColor: '#4CAF50', borderRadius: 8, padding: 10, minWidth: 80, alignItems: 'center' } }>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Submit Ball</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Scorecard Tab Modal */}
      <Modal visible={scorecardTab === 'batting' && liveScoringModal.visible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Batting Scorecard</Text>
            <FlatList
              data={scorecardData.batting}
              keyExtractor={(item, index) => item.id || index.toString()}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text>{item.batting_position}. {item.player_name}</Text>
                  <Text>Runs: {item.runs_scored}, Balls: {item.balls_faced}, 4s: {item.fours}, 6s: {item.sixes}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center' }}>No batting scorecard available.</Text>}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity onPress={() => setScorecardTab('bowling')} style={{ padding: 10 }}>
                <Text style={{ color: '#888' }}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={scorecardTab === 'bowling' && liveScoringModal.visible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Bowling Scorecard</Text>
            <FlatList
              data={scorecardData.bowling}
              keyExtractor={(item, index) => item.id || index.toString()}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text>{item.bowling_position}. {item.player_name}</Text>
                  <Text>Overs: {item.overs_bowled}, Runs: {item.runs_conceded}, Wickets: {item.wickets_taken}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center' }}>No bowling scorecard available.</Text>}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity onPress={() => setScorecardTab('fow')} style={{ padding: 10 }}>
                <Text style={{ color: '#888' }}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={scorecardTab === 'fow' && liveScoringModal.visible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Fall of Wickets</Text>
            <FlatList
              data={scorecardData.fow}
              keyExtractor={(item, index) => item.over + index.toString()}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text>Wicket at {item.over}.{item.ball}</Text>
                  <Text>Batsman: {item.batsman_name}, Score: {item.score}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center' }}>No fall of wickets available.</Text>}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity onPress={() => setScorecardTab('balls')} style={{ padding: 10 }}>
                <Text style={{ color: '#888' }}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={scorecardTab === 'balls' && liveScoringModal.visible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Ball-by-Ball</Text>
            <FlatList
              data={scorecardData.balls}
              keyExtractor={(item, index) => item.over + item.ball + index.toString()}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text>{item.over}.{item.ball}</Text>
                  <Text>Batsman: {item.batsman_name}, Bowler: {item.bowler_name}, Runs: {item.runs}, Extras: {item.extras}, Wicket: {item.wicket ? 'Yes' : 'No'}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center' }}>No ball-by-ball data available.</Text>}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity onPress={() => setLiveScoringModal({ visible: false, match: null })} style={{ padding: 10 }}>
                <Text style={{ color: '#888' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Stat Approval Modal */}
      <Modal visible={statApprovalModal.visible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Approve Match Stats</Text>
            <Text>Match: {statApprovalModal.match?.team_a?.name} vs {statApprovalModal.match?.team_b?.name}</Text>
            <Text style={{ marginBottom: 12 }}>Status: {statApprovalModal.match?.status.toUpperCase()}</Text>
            <Text style={{ marginBottom: 12 }}>Winner: {statApprovalModal.match?.winner_id === statApprovalModal.match?.team_a_id ? statApprovalModal.match?.team_a?.name : statApprovalModal.match?.team_b?.name}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity onPress={() => setStatApprovalModal({ visible: false, match: null })} style={{ padding: 10 }}>
                <Text style={{ color: '#888' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleApproveStats} style={{ backgroundColor: '#4CAF50', borderRadius: 8, padding: 10, minWidth: 80, alignItems: 'center' } }>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFD700',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginLeft: 4,
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
    textTransform: 'capitalize',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  tournamentFeatures: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    width: '100%',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  tournamentCard: {
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
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 6,
  },
  formatBadge: {
    backgroundColor: '#2E7D32',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  formatText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tournamentStats: {
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
  tournamentActions: {
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
