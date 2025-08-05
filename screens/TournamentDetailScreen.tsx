import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, ScrollView, Alert, Share } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../utils/supabaseClient';

const TABS = ['Overview', 'Fixtures', 'Points/Bracket', 'Teams'];

export default function TournamentDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { tournamentId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [approvedTeams, setApprovedTeams] = useState([]);
  const [teamRequests, setTeamRequests] = useState([]);
  const [generatingFixtures, setGeneratingFixtures] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [userId, setUserId] = useState(null);
  const [playerStats, setPlayerStats] = useState({}); // { playerId: { runs, wickets, matches } }

  useEffect(() => {
    fetchUserId();
    fetchTournament();
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId) return;
    // Fetch all match_performances for this tournament
    const fetchStats = async () => {
      // Get all matches in this tournament
      const { data: matchRows } = await supabase.from('tournament_matches').select('id').eq('tournament_id', tournamentId);
      const matchIds = (matchRows || []).map(m => m.id);
      if (matchIds.length === 0) return setPlayerStats({});
      // Get all performances for these matches
      const { data: perfRows } = await supabase.from('match_performances').select('*').in('match_id', matchIds);
      // Aggregate stats by player_id
      const stats = {};
      (perfRows || []).forEach(row => {
        if (!stats[row.player_id]) stats[row.player_id] = { runs: 0, wickets: 0, matches: 0 };
        stats[row.player_id].runs += row.runs || 0;
        stats[row.player_id].wickets += row.wickets || 0;
        stats[row.player_id].matches += 1;
      });
      setPlayerStats(stats);
    };
    fetchStats();
  }, [tournamentId, tab]);

  const fetchUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUserId(session?.user?.id || null);
  };

  const fetchTournament = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: t } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
      setTournament(t);
      const { data: teamRows } = await supabase.from('tournament_teams').select('*, teams(name)').eq('tournament_id', tournamentId);
      setTeams(teamRows || []);
      setApprovedTeams((teamRows || []).filter(tr => tr.status === 'approved'));
      setTeamRequests((teamRows || []).filter(tr => tr.status === 'requested'));
      const { data: matchRows } = await supabase.from('tournament_matches').select('*, team_a:teams!team_a_id(name), team_b:teams!team_b_id(name)').eq('tournament_id', tournamentId);
      setMatches(matchRows || []);
    } catch (e) {
      setError('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  // Organizer: Approve/Reject team
  const handleTeamApproval = async (teamId, approve) => {
    try {
      await supabase.from('tournament_teams').update({ status: approve ? 'approved' : 'rejected' }).eq('tournament_id', tournamentId).eq('team_id', teamId);
      fetchTournament();
    } catch (e) {
      Alert.alert('Error', 'Failed to update team status');
    }
  };

  // Organizer: Generate fixtures (robust for knockout and league, always fetch approved teams from DB)
  const handleGenerateFixtures = async () => {
    setGeneratingFixtures(true);
    try {
      if (!tournament) throw new Error('Tournament not loaded');
      // Always fetch approved teams from DB
      const { data: approvedRows, error: teamFetchError } = await supabase
        .from('tournament_teams')
        .select('team_id')
        .eq('tournament_id', tournamentId)
        .eq('status', 'approved');
      if (teamFetchError) throw teamFetchError;
      const teamsList = approvedRows || [];
      if (teamsList.length < 2) throw new Error('At least 2 teams required');
      // Start scheduling from tomorrow at 10:00 AM
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + 1);
      baseDate.setHours(10, 0, 0, 0);
      const venue = 'TBD';
      let matches = [];
      if (tournament.format === 'knockout') {
        const shuffled = teamsList.sort(() => Math.random() - 0.5);
        for (let i = 0; i < shuffled.length; i += 2) {
          const matchDate = new Date(baseDate);
          matchDate.setDate(baseDate.getDate() + Math.floor(i / 2));
          const scheduledAt = matchDate instanceof Date && !isNaN(matchDate) ? matchDate.toISOString() : null;
          if (!scheduledAt) {
            Alert.alert('Error', 'Invalid scheduled date for match');
            setGeneratingFixtures(false);
            return;
          }
          if (i + 1 < shuffled.length) {
            matches.push({
              tournament_id: tournamentId,
              round: 1,
              match_no: i / 2 + 1,
              team_a_id: shuffled[i].team_id,
              team_b_id: shuffled[i + 1].team_id,
              scheduled_at: scheduledAt,
              venue,
              status: 'scheduled',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          } else {
            matches.push({
              tournament_id: tournamentId,
              round: 1,
              match_no: Math.ceil((i + 1) / 2),
              team_a_id: shuffled[i].team_id,
              team_b_id: null,
              scheduled_at: scheduledAt,
              venue,
              status: 'bye',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_bye: true,
            });
          }
        }
      } else if (tournament.format === 'league') {
        let matchNo = 1;
        for (let i = 0; i < teamsList.length; i++) {
          for (let j = i + 1; j < teamsList.length; j++) {
            const matchDate = new Date(baseDate);
            matchDate.setDate(baseDate.getDate() + (matchNo - 1));
            const scheduledAt = matchDate instanceof Date && !isNaN(matchDate) ? matchDate.toISOString() : null;
            if (!scheduledAt) {
              Alert.alert('Error', 'Invalid scheduled date for match');
              setGeneratingFixtures(false);
              return;
            }
            matches.push({
              tournament_id: tournamentId,
              round: 1,
              match_no: matchNo++,
              team_a_id: teamsList[i].team_id,
              team_b_id: teamsList[j].team_id,
              scheduled_at: scheduledAt,
              venue,
              status: 'scheduled',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      } else {
        throw new Error('Unsupported tournament format');
      }
      if (matches.length === 0) throw new Error('No matches to create');
      // Debug log before insert
      console.log('Matches to insert:', matches);
      // Check for any missing scheduled_at
      if (matches.some(m => !m.scheduled_at)) {
        Alert.alert('Error', 'One or more matches missing scheduled date');
        setGeneratingFixtures(false);
        return;
      }
      const { error } = await supabase.from('tournament_matches').insert(matches);
      if (error) {
        console.log('Fixture insert error:', error);
        Alert.alert('Error', error.message);
        setGeneratingFixtures(false);
        return;
      }
      fetchTournament();
      Alert.alert('Fixtures Generated', `${matches.length} matches created!`);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to generate fixtures');
    } finally {
      setGeneratingFixtures(false);
    }
  };

  // Points Table (for league)
  const getPointsTable = () => {
    const table = {};
    approvedTeams.forEach(t => {
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

  // Knockout rounds
  const getKnockoutRounds = () => {
    const rounds = {};
    matches.forEach(m => {
      if (!rounds[m.round]) rounds[m.round] = [];
      rounds[m.round].push(m);
    });
    return rounds;
  };

  const isOrganizer = userId && tournament && tournament.organizer_id === userId;

  const shareTournament = () => {
    if (!tournament) return;
    const link = `gullycricketx://join/tournament/${tournament.id}`; // Use app scheme for deep linking
    Share.share({
      message: `Join my tournament on GullyCricketX! Click here: ${link}`,
      url: link,
      title: 'Join my tournament!',
    });
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error) return <View style={styles.center}><Text>{error}</Text></View>;
  if (!tournament) return <View style={styles.center}><Text>Not found</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{tournament.name}</Text>
        <Text style={styles.subtitle}>{tournament.format} | {tournament.overs_per_match} overs | Status: {tournament.status}</Text>
        <Text style={styles.organizer}>Organizer: {tournament.organizer_id}</Text>
      </View>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.activeTab]} onPress={() => setTab(t)}>
            <Text style={{ color: tab === t ? '#2E7D32' : '#666', fontWeight: 'bold' }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Tab Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {tab === 'Overview' && (
          <View>
            <Text style={styles.sectionTitle}>Teams Joined: {approvedTeams.length}/{tournament.max_teams}</Text>
            {matches.length > 0 && (
              <Text style={styles.sectionTitle}>Next Match: {matches[0].team_a?.name} vs {matches[0].team_b?.name} (Round {matches[0].round})</Text>
            )}
            {isOrganizer && approvedTeams.length >= 2 && matches.length === 0 && (
              <TouchableOpacity onPress={handleGenerateFixtures} style={styles.genBtn} disabled={generatingFixtures}>
                <Text style={{ color: '#2E7D32', fontWeight: 'bold' }}>{generatingFixtures ? 'Generating...' : 'Generate Fixtures'}</Text>
              </TouchableOpacity>
            )}
            {isOrganizer && (
              <TouchableOpacity style={[styles.genBtn, { backgroundColor: '#2196F3', marginBottom: 10 }]} onPress={shareTournament}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Share Tournament</Text>
              </TouchableOpacity>
            )}
            {isOrganizer && teamRequests.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionTitle}>Team Requests</Text>
                {teamRequests.map(tr => (
                  <View key={tr.team_id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ flex: 1 }}>{tr.teams?.name || 'Team'}</Text>
                    <TouchableOpacity onPress={() => handleTeamApproval(tr.team_id, true)} style={styles.approveBtn}><Text style={{ color: '#fff' }}>Approve</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleTeamApproval(tr.team_id, false)} style={styles.rejectBtn}><Text style={{ color: '#fff' }}>Reject</Text></TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        {tab === 'Fixtures' && (
          <View>
            <Text style={styles.sectionTitle}>Fixtures/Matches</Text>
            {matches.length === 0 && (
              <Text style={{ color: '#888', marginBottom: 12 }}>No fixtures yet.</Text>
            )}
            {matches.map(m => (
              <View key={m.id} style={styles.matchCard}>
                <Text style={{ fontWeight: 'bold' }}>{m.team_a?.name} vs {m.team_b?.name}</Text>
                <Text>Round {m.round} | Status: {m.status.toUpperCase()}</Text>
                <Text>
                  Scheduled: {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : 'TBD'}
                </Text>
                {m.status === 'completed' && (
                  <Text style={{ color: '#388E3C' }}>Winner: {m.winner_id === m.team_a_id ? m.team_a?.name : m.team_b?.name}</Text>
                )}
                {(m.status === 'scheduled' || m.status === 'live' || m.status === 'delayed') && (
                  <TouchableOpacity style={styles.liveBtn} onPress={() => navigation.navigate('LiveScoring', { matchId: m.id })}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                      {m.status === 'delayed' ? 'Resume Scoring' : 'Live Scoring'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.scorecardBtn} onPress={() => navigation.navigate('Scorecard', { matchId: m.id })}>
                  <Text style={{ color: '#2E7D32', fontWeight: 'bold' }}>Scorecard</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {tab === 'Points/Bracket' && (
          <View>
            {tournament.format === 'league' ? (
              <View>
                <Text style={styles.sectionTitle}>Points Table</Text>
                {getPointsTable().map((row, idx) => (
                  <View key={row.name} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                    <Text>{idx + 1}. {row.name}</Text>
                    <Text>P:{row.played} W:{row.won} L:{row.lost} Pts:{row.points}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>Knockout Bracket</Text>
                {Object.entries(getKnockoutRounds()).map(([round, matches]) => (
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
        {tab === 'Teams' && (
          <View>
            <Text style={styles.sectionTitle}>Teams</Text>
            <FlatList
              data={teams}
              keyExtractor={item => item.team_id}
              renderItem={({ item }) => {
                // Robustly parse players array from team object
                let playersArr = item.teams?.players;
                if (!Array.isArray(playersArr)) {
                  try {
                    playersArr = JSON.parse(playersArr);
                  } catch {
                    playersArr = [];
                  }
                }
                // Debug log for troubleshooting
                if (__DEV__) {
                  console.log('Team:', item.teams?.name, 'Players:', playersArr);
                }
                return (
                  <View style={[styles.teamRow, { flexDirection: 'column', alignItems: 'flex-start' }]}> 
                    <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.teamName}>{item.teams?.name || 'Team'}</Text>
                      <Text style={styles.teamStatus}>{item.status.toUpperCase()}</Text>
                    </View>
                    <View style={{ marginTop: 4, marginBottom: 8, width: '100%' }}>
                      {Array.isArray(playersArr) && playersArr.length > 0 ? (
                        playersArr.map((player, idx) => {
                          const stats = playerStats[player.id] || { runs: 0, wickets: 0, matches: 0 };
                          return (
                            <View key={player.id || idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                              <Text style={{ fontWeight: 'bold', color: '#222', marginRight: 8 }}>{player.name}</Text>
                              <Text style={{ color: '#888', marginRight: 8 }}>{player.role}</Text>
                              <Text style={{ color: '#2196F3', marginRight: 8 }}>Runs: {stats.runs}</Text>
                              <Text style={{ color: '#E91E63', marginRight: 8 }}>Wkts: {stats.wickets}</Text>
                              <Text style={{ color: '#888' }}>Matches: {stats.matches}</Text>
                            </View>
                          );
                        })
                      ) : (
                        <Text style={{ color: '#888' }}>No players found.</Text>
                      )}
                    </View>
                  </View>
                );
              }}
              style={{ marginBottom: 12 }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: '#E8F5E8', borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 4 },
  organizer: { fontSize: 14, color: '#888', marginBottom: 4 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
  tabBtn: { flex: 1, padding: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderColor: '#FFD700', backgroundColor: '#FFFDE7' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8, color: '#2E7D32' },
  matchCard: { backgroundColor: '#E3F2FD', borderRadius: 8, padding: 12, marginBottom: 8 },
  liveBtn: { backgroundColor: '#4CAF50', borderRadius: 6, padding: 8, marginTop: 8, alignItems: 'center' },
  scorecardBtn: { backgroundColor: '#FFD700', borderRadius: 6, padding: 8, marginTop: 8, alignItems: 'center' },
  genBtn: { backgroundColor: '#FFD700', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 16 },
  approveBtn: { backgroundColor: '#4CAF50', borderRadius: 6, padding: 6, marginRight: 8 },
  rejectBtn: { backgroundColor: '#E53935', borderRadius: 6, padding: 6 },
  teamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' },
  teamName: { fontSize: 16, color: '#2E7D32' },
  teamStatus: { fontSize: 14, color: '#888' },
}); 