import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { supabase } from '../utils/supabaseClient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const TABS = ['Batting', 'Bowling', 'Summary'];

export default function LiveMatchSummaryScreen({ route, navigation }) {
  const { matchId } = route.params;
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState(null);
  const [teams, setTeams] = useState({ team1: null, team2: null });
  const [players, setPlayers] = useState({ team1: [], team2: [] });
  const [performances, setPerformances] = useState([]);
  const [user, setUser] = useState(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [inputStats, setInputStats] = useState({ runs: '', wickets: '', catches: '', strike_rate: '', economy_rate: '', remarks: '' });
  const [inputStatus, setInputStatus] = useState('draft');
  const [inputFeedback, setInputFeedback] = useState('');
  const [inputLocked, setInputLocked] = useState(false);
  const [tab, setTab] = useState('Batting');

  // Fetch match, teams, players, analytics, user
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      setUser({ id: userId });

      // Fetch match
      const { data: matchData } = await supabase.from('matches').select('*').eq('id', matchId).single();
      setMatch(matchData);

      // Fetch teams
      const { data: team1 } = await supabase.from('teams').select('*').eq('id', matchData.team1_id).eq('is_deleted', false).single();
      const { data: team2 } = await supabase.from('teams').select('*').eq('id', matchData.team2_id).eq('is_deleted', false).single();
      setTeams({ team1, team2 });

      // Parse players
      const team1Players = team1.players ? JSON.parse(team1.players) : [];
      const team2Players = team2.players ? JSON.parse(team2.players) : [];
      setPlayers({ team1: team1Players, team2: team2Players });

      // Fetch match_performances instead of analytics
      const { data: performances } = await supabase.from('match_performances').select('*').eq('match_id', matchId);
      setPerformances(performances || []);

      setLoading(false);
    };
    fetchData();
  }, [matchId]);

  // Real-time subscription for match_performances
  useEffect(() => {
    const channel = supabase
      .channel('match-performances-' + matchId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_performances', filter: `match_id=eq.${matchId}` }, payload => {
        supabase.from('match_performances').select('*').eq('match_id', matchId).then(({ data }) => setPerformances(data || []));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [matchId]);

  if (loading) return <ActivityIndicator />;

  // Helper to get analytics for a player
  const getPlayerAnalytics = (playerId) => performances.find(p => p.player_id === playerId);

  // Helper: is input locked?
  const isInputLocked = (performanceRow) => {
    if (!match || !match.scheduled_at) return true;
    const matchStart = new Date(match.scheduled_at).getTime();
    const now = Date.now();
    const is24hPassed = now > matchStart + 24 * 60 * 60 * 1000;
    if (is24hPassed) return true;
    if (!performanceRow) return false;
    if (performanceRow.status === 'confirmed' || performanceRow.status === 'expired') return true;
    return false;
  };

  // UI for a single player card
  const PlayerCard = ({ player, teamColor }) => {
    const performanceRow = getPlayerAnalytics(player.id);
    const isSelf = user.id === player.id;
    return (
      <View style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        marginVertical: 8,
        marginHorizontal: 4,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        borderLeftWidth: 6,
        borderLeftColor: teamColor,
      }}>
        <Image source={{ uri: player.profilePicture }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{player.name} <Text style={{ color: '#888', fontSize: 13 }}>#{player.jerseyNumber}</Text></Text>
          <Text style={{ color: '#888', fontSize: 13 }}>{player.role}</Text>
          {performanceRow && <Text style={{ color: '#4cd137', fontSize: 13 }}>Status: {performanceRow.status}</Text>}
        </View>
        {isSelf && (
          <TouchableOpacity
            style={{
              backgroundColor: '#FFD700',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              marginLeft: 8,
            }}
            onPress={() => {
              setSelectedPlayer(player);
              // Pre-fill input if analytics exists
              if (performanceRow) {
                setInputStats({
                  runs: performanceRow.runs?.toString() || '',
                  wickets: performanceRow.wickets?.toString() || '',
                  catches: performanceRow.catches?.toString() || '',
                  strike_rate: performanceRow.strike_rate?.toString() || '',
                  economy_rate: performanceRow.economy_rate?.toString() || '',
                  remarks: performanceRow.remarks || '',
                });
                setInputStatus(performanceRow.status);
                setInputFeedback(performanceRow.feedback_a || performanceRow.feedback_b || '');
                setInputLocked(isInputLocked(performanceRow));
              } else {
                setInputStats({ runs: '', wickets: '', catches: '', strike_rate: '', economy_rate: '', remarks: '' });
                setInputStatus('draft');
                setInputFeedback('');
                setInputLocked(isInputLocked(null));
              }
              setShowAnalyticsModal(true);
            }}>
            <Text style={{ color: '#222', fontWeight: 'bold' }}>My Performance</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Save or submit analytics
  const handleSaveOrSubmit = async (submit = false) => {
    if (!selectedPlayer) return;
    const performanceRow = getPlayerAnalytics(selectedPlayer.id);
    const payload = {
      match_id: matchId,
      player_id: selectedPlayer.id,
      team_id: teams.team1.players?.includes(selectedPlayer.id) ? teams.team1.id : teams.team2.id,
      runs: Number(inputStats.runs) || 0,
      wickets: Number(inputStats.wickets) || 0,
      catches: Number(inputStats.catches) || 0,
      strike_rate: Number(inputStats.strike_rate) || null,
      economy_rate: Number(inputStats.economy_rate) || null,
      remarks: inputStats.remarks,
      status: submit ? 'submitted' : 'draft',
      submitted_at: submit ? new Date().toISOString() : null,
    };
    try {
      if (performanceRow) {
        await supabase.from('match_performances').update(payload).eq('id', performanceRow.id);
      } else {
        await supabase.from('match_performances').insert([payload]);
      }
      if (submit) {
        Alert.alert('Submitted', 'Your stats have been submitted for approval.');
        // Send notification to captains
        let captainIds = [];
        if (teams.team1 && teams.team1.captainId) captainIds.push(teams.team1.captainId);
        if (teams.team2 && teams.team2.captainId) captainIds.push(teams.team2.captainId);
        // Remove duplicates
        captainIds = [...new Set(captainIds)];
        if (captainIds.length > 0) {
          const { data: captains } = await supabase.from('users').select('id, expoPushToken, name, username').in('id', captainIds);
          for (const captain of captains || []) {
            if (captain.expoPushToken) {
              await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: captain.expoPushToken,
                  title: 'Player Stats Submitted',
                  body: `${selectedPlayer.name || 'A player'} submitted match stats. Please review and confirm.`,
                  data: { type: 'stats_submitted', matchId, playerId: selectedPlayer.id }
                })
              });
            }
          }
        }
      } else {
        Alert.alert('Saved', 'Draft saved.');
      }
      setShowAnalyticsModal(false);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save stats.');
    }
  };

  // Add these functions inside the component:
  const handleApprove = async (performanceRow, isConfirm) => {
    try {
      // Determine which captain is acting
      const isCaptainA = teams.team1.captainId === user.id;
      const isCaptainB = teams.team2.captainId === user.id;
      let update = {};
      if (isConfirm) {
        if (isCaptainA) update.confirmed_by_captain_a = true;
        if (isCaptainB) update.confirmed_by_captain_b = true;
      } else {
        if (isCaptainA) update.rejected_by_captain_a = true;
        if (isCaptainB) update.rejected_by_captain_b = true;
      }
      // If both confirmed, set status to 'confirmed'
      if (
        (isConfirm && (
          (isCaptainA && performanceRow.confirmed_by_captain_b) ||
          (isCaptainB && performanceRow.confirmed_by_captain_a)
        ))
      ) {
        update.status = 'confirmed';
      }
      // If rejected, set status to 'rejected'
      if (!isConfirm) {
        update.status = 'rejected';
      }
      await supabase.from('match_performances').update(update).eq('id', performanceRow.id);
      // Send notification to player
      const { data: userData } = await supabase.from('users').select('expoPushToken').eq('id', performanceRow.player_id).single();
      if (userData?.expoPushToken) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: userData.expoPushToken,
            title: isConfirm ? 'Stats Confirmed' : 'Stats Rejected',
            body: isConfirm
              ? 'Your match stats have been confirmed by a captain.'
              : 'Your match stats were rejected by a captain. Please review and resubmit.',
            data: { type: 'analytics_approval', matchId }
          })
        });
      }
      Alert.alert(isConfirm ? 'Confirmed' : 'Rejected', `Player has been ${isConfirm ? 'confirmed' : 'rejected'}.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update approval.');
    }
  };

  const handleRejectPrompt = (performanceRow) => {
    Alert.prompt(
      'Reject Stats',
      'Optionally provide feedback for the player:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          onPress: async (feedback) => {
            // Save feedback and reject
            const isCaptainA = teams.team1.captainId === user.id;
            const isCaptainB = teams.team2.captainId === user.id;
            let update = {};
            if (isCaptainA) update.feedback_a = feedback;
            if (isCaptainB) update.feedback_b = feedback;
            update.status = 'rejected';
            if (isCaptainA) update.rejected_by_captain_a = true;
            if (isCaptainB) update.rejected_by_captain_b = true;
            await supabase.from('match_performances').update(update).eq('id', performanceRow.id);
            // Send notification to player (reuse logic above)
            const { data: userData } = await supabase.from('users').select('expoPushToken').eq('id', performanceRow.player_id).single();
            if (userData?.expoPushToken) {
              await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: userData.expoPushToken,
                  title: 'Stats Rejected',
                  body: 'Your match stats were rejected by a captain. Please review and resubmit.',
                  data: { type: 'analytics_approval', matchId }
                })
              });
            }
            Alert.alert('Rejected', 'Player has been rejected.');
          }
        }
      ],
      'plain-text'
    );
  };

  // Main render
  return (
    <View style={{ flex: 1, backgroundColor: '#f8f8f8' }}>
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        {/* Match Summary Panel */}
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 18,
          padding: 18,
          marginBottom: 18,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 6,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            {teams.team1.logo_url && <Image source={{ uri: teams.team1.logo_url }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 8 }} />}
            <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{teams.team1.name}</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginHorizontal: 8, color: '#FFD700' }}>VS</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{teams.team2.name}</Text>
            {teams.team2.logo_url && <Image source={{ uri: teams.team2.logo_url }} style={{ width: 40, height: 40, borderRadius: 20, marginLeft: 8 }} />}
          </View>
          <Text style={{ color: '#4cd137', fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>
            {match.status === 'live' ? 'Live' : match.status}
          </Text>
          <Text style={{ color: '#222', fontSize: 15 }}>
            Toss: {match.toss_winner_team ? (match.toss_winner_team === teams.team1.id ? teams.team1.name : teams.team2.name) : 'TBD'}
            {match.toss_choice ? ` chose to ${match.toss_choice}` : ''}
          </Text>
          <Text style={{ color: '#888', fontSize: 13 }}>
            {match.match_type} | {match.overs} overs | {match.ball_type} ball
          </Text>
        </View>

        {/* Tab selector UI */}
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          {TABS.map(t => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ flex: 1, padding: 10, backgroundColor: tab === t ? '#2196F3' : '#eee', borderRadius: 8, marginHorizontal: 2 }}>
              <Text style={{ color: tab === t ? '#fff' : '#222', textAlign: 'center', fontWeight: 'bold' }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Batting Tab */}
        {tab === 'Batting' && (
          <View>
            {/* Team 1 Batting Table */}
            <Text style={{ fontWeight: 'bold', fontSize: 17, marginBottom: 8, color: '#2196F3' }}>{teams.team1.name} Batting</Text>
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 4 }}>
              <Text style={{ flex: 2, fontWeight: 'bold' }}>Batsman</Text>
              <Text style={{ flex: 2, fontWeight: 'bold' }}>How Out</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>R</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>B</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>4s</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>6s</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>SR</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>Status</Text>
            </View>
            {players.team1.map(player => {
              const p = performances.find(perf => perf.player_id === player.id);
              const isSelf = user.id === player.id;
              return (
                <View key={player.id} style={{ flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderColor: '#f0f0f0', alignItems: 'center' }}>
                  <Text style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                    {player.name || 'Player'}
                    {isSelf && (
                      <TouchableOpacity onPress={() => {
                        setSelectedPlayer(player);
                        if (p) {
                          setInputStats({
                            runs: p.runs?.toString() || '',
                            wickets: p.wickets?.toString() || '',
                            catches: p.catches?.toString() || '',
                            strike_rate: p.strike_rate?.toString() || '',
                            economy_rate: p.economy_rate?.toString() || '',
                            remarks: p.remarks || '',
                          });
                          setInputStatus(p.status);
                          setInputFeedback(p.feedback_a || p.feedback_b || '');
                          setInputLocked(isInputLocked(p));
                        } else {
                          setInputStats({ runs: '', wickets: '', catches: '', strike_rate: '', economy_rate: '', remarks: '' });
                          setInputStatus('draft');
                          setInputFeedback('');
                          setInputLocked(isInputLocked(null));
                        }
                        setShowAnalyticsModal(true);
                      }} style={{ marginLeft: 6 }}>
                        <MaterialIcons name="edit" size={18} color="#FFD700" />
                      </TouchableOpacity>
                    )}
                  </Text>
                  <Text style={{ flex: 2, fontSize: 12 }}>{p?.how_out || (p?.runs > 0 ? 'Not Out' : '')}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.runs ?? 0}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.balls_faced ?? 0}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.fours ?? 0}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.sixes ?? 0}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.strike_rate ? p.strike_rate.toFixed(2) : ((p?.balls_faced > 0) ? ((p.runs / p.balls_faced) * 100).toFixed(2) : '0.00')}</Text>
                  <Text style={{ flex: 1, textAlign: 'center', color: p?.status === 'pending' ? '#FFA500' : (p?.status === 'confirmed' ? '#4cd137' : '#888') }}>{!p ? 'Not Yet Updated' : (p.status === 'not_submitted' ? 'Not Yet Updated' : (p.status === 'pending' ? 'Pending' : (p.status === 'confirmed' ? 'Confirmed' : 'Not Started')))}</Text>
                </View>
              );
            })}
            {/* Repeat for Team 2 */}
            <Text style={{ fontWeight: 'bold', fontSize: 17, marginTop: 18, marginBottom: 8, color: '#E91E63' }}>{teams.team2.name} Batting</Text>
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 4 }}>
              <Text style={{ flex: 2, fontWeight: 'bold' }}>Batsman</Text>
              <Text style={{ flex: 2, fontWeight: 'bold' }}>How Out</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>R</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>B</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>4s</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>6s</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>SR</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>Status</Text>
            </View>
            {players.team2.map(player => {
              const p = performances.find(perf => perf.player_id === player.id);
              const isSelf = user.id === player.id;
              return (
                <View key={player.id} style={{ flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderColor: '#f0f0f0', alignItems: 'center' }}>
                  <Text style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                    {player.name || 'Player'}
                    {isSelf && (
                      <TouchableOpacity onPress={() => {
                        setSelectedPlayer(player);
                        if (p) {
                          setInputStats({
                            runs: p.runs?.toString() || '',
                            wickets: p.wickets?.toString() || '',
                            catches: p.catches?.toString() || '',
                            strike_rate: p.strike_rate?.toString() || '',
                            economy_rate: p.economy_rate?.toString() || '',
                            remarks: p.remarks || '',
                          });
                          setInputStatus(p.status);
                          setInputFeedback(p.feedback_a || p.feedback_b || '');
                          setInputLocked(isInputLocked(p));
                        } else {
                          setInputStats({ runs: '', wickets: '', catches: '', strike_rate: '', economy_rate: '', remarks: '' });
                          setInputStatus('draft');
                          setInputFeedback('');
                          setInputLocked(isInputLocked(null));
                        }
                        setShowAnalyticsModal(true);
                      }} style={{ marginLeft: 6 }}>
                        <MaterialIcons name="edit" size={18} color="#FFD700" />
                      </TouchableOpacity>
                    )}
                  </Text>
                  <Text style={{ flex: 2, fontSize: 12 }}>{p?.how_out || (p?.runs > 0 ? 'Not Out' : '')}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.runs ?? 0}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.balls_faced ?? 0}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.fours ?? 0}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.sixes ?? 0}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.strike_rate ? p.strike_rate.toFixed(2) : ((p?.balls_faced > 0) ? ((p.runs / p.balls_faced) * 100).toFixed(2) : '0.00')}</Text>
                  <Text style={{ flex: 1, textAlign: 'center', color: p?.status === 'pending' ? '#FFA500' : (p?.status === 'confirmed' ? '#4cd137' : '#888') }}>{!p ? 'Not Yet Updated' : (p.status === 'not_submitted' ? 'Not Yet Updated' : (p.status === 'pending' ? 'Pending' : (p.status === 'confirmed' ? 'Confirmed' : 'Not Started')))}</Text>
                </View>
              );
            })}
          </View>
        )}
        {/* Bowling Tab */}
        {tab === 'Bowling' && (
          <View>
            {/* Team 1 Bowling Table */}
            <Text style={{ fontWeight: 'bold', fontSize: 17, marginBottom: 8, color: '#2196F3' }}>{teams.team1.name} Bowling</Text>
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 4 }}>
              <Text style={{ flex: 2, fontWeight: 'bold' }}>Bowler</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>O</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>M</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>R</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>W</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>Econ</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>Status</Text>
            </View>
            {players.team1.map(player => {
              const p = performances.find(perf => perf.player_id === player.id);
              const isSelf = user.id === player.id;
              return (
                <View key={player.id} style={{ flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderColor: '#f0f0f0', alignItems: 'center' }}>
                  <Text style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                    {player.name || 'Player'}
                    {isSelf && (
                      <TouchableOpacity onPress={() => {
                        setSelectedPlayer(player);
                        if (p) {
                          setInputStats({
                            overs: p.overs?.toString() || '',
                            maidens: p.maidens?.toString() || '',
                            runs_conceded: p.runs_conceded?.toString() || '',
                            wickets: p.wickets?.toString() || '',
                            economy_rate: p.economy_rate?.toString() || '',
                            remarks: p.remarks || '',
                          });
                          setInputStatus(p.status);
                          setInputFeedback(p.feedback_a || p.feedback_b || '');
                          setInputLocked(isInputLocked(p));
                        } else {
                          setInputStats({ overs: '', maidens: '', runs_conceded: '', wickets: '', economy_rate: '', remarks: '' });
                          setInputStatus('draft');
                          setInputFeedback('');
                          setInputLocked(isInputLocked(null));
                        }
                        setShowAnalyticsModal(true);
                      }} style={{ marginLeft: 6 }}>
                        <MaterialIcons name="edit" size={18} color="#FFD700" />
                      </TouchableOpacity>
                    )}
                  </Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.overs ?? 0}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.maidens ?? 0}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.runs_conceded ?? 0}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.wickets ?? 0}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.economy_rate ? p.economy_rate.toFixed(2) : '0.00'}</Text>
                  <Text style={{ flex: 1, textAlign: 'center', color: p?.status === 'pending' ? '#FFA500' : (p?.status === 'confirmed' ? '#4cd137' : '#888') }}>{!p ? 'Not Yet Updated' : (p.status === 'not_submitted' ? 'Not Yet Updated' : (p.status === 'pending' ? 'Pending' : (p.status === 'confirmed' ? 'Confirmed' : 'Not Started')))}</Text>
                </View>
              );
            })}
            {/* Repeat for Team 2 */}
            <Text style={{ fontWeight: 'bold', fontSize: 17, marginTop: 18, marginBottom: 8, color: '#E91E63' }}>{teams.team2.name} Bowling</Text>
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 4 }}>
              <Text style={{ flex: 2, fontWeight: 'bold' }}>Bowler</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>O</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>M</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>R</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>W</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>Econ</Text>
              <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>Status</Text>
            </View>
            {players.team2.map(player => {
              const p = performances.find(perf => perf.player_id === player.id);
              const isSelf = user.id === player.id;
              return (
                <View key={player.id} style={{ flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderColor: '#f0f0f0', alignItems: 'center' }}>
                  <Text style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                    {player.name || 'Player'}
                    {isSelf && (
                      <TouchableOpacity onPress={() => {
                        setSelectedPlayer(player);
                        if (p) {
                          setInputStats({
                            overs: p.overs?.toString() || '',
                            maidens: p.maidens?.toString() || '',
                            runs_conceded: p.runs_conceded?.toString() || '',
                            wickets: p.wickets?.toString() || '',
                            economy_rate: p.economy_rate?.toString() || '',
                            remarks: p.remarks || '',
                          });
                          setInputStatus(p.status);
                          setInputFeedback(p.feedback_a || p.feedback_b || '');
                          setInputLocked(isInputLocked(p));
                        } else {
                          setInputStats({ overs: '', maidens: '', runs_conceded: '', wickets: '', economy_rate: '', remarks: '' });
                          setInputStatus('draft');
                          setInputFeedback('');
                          setInputLocked(isInputLocked(null));
                        }
                        setShowAnalyticsModal(true);
                      }} style={{ marginLeft: 6 }}>
                        <MaterialIcons name="edit" size={18} color="#FFD700" />
                      </TouchableOpacity>
                    )}
                  </Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.overs ?? 0}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.maidens ?? 0}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.runs_conceded ?? 0}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.wickets ?? 0}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{p?.economy_rate ? p.economy_rate.toFixed(2) : '0.00'}</Text>
                  <Text style={{ flex: 1, textAlign: 'center', color: p?.status === 'pending' ? '#FFA500' : (p?.status === 'confirmed' ? '#4cd137' : '#888') }}>{!p ? 'Not Yet Updated' : (p.status === 'not_submitted' ? 'Not Yet Updated' : (p.status === 'pending' ? 'Pending' : (p.status === 'confirmed' ? 'Confirmed' : 'Not Started')))}</Text>
                </View>
              );
            })}
          </View>
        )}
        {/* Summary Tab */}
        {tab === 'Summary' && (
          <View>
            {/* Show team totals, run rate, MVP, etc. */}
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Final Match Summary</Text>
            <Text style={{ fontWeight: 'bold', color: '#2196F3', marginTop: 8 }}>{teams.team1.name} Scorecard</Text>
            <Text>Total Runs: {performances.filter(p => p.team_id === teams.team1.id).reduce((sum, p) => sum + (p.runs || 0), 0)} | Wickets: {performances.filter(p => p.team_id === teams.team1.id).reduce((sum, p) => sum + (p.wickets || 0), 0)}</Text>
            {performances.filter(p => p.team_id === teams.team1.id).map(p => {
              const player = [...players.team1, ...players.team2].find(pl => pl.id === p.player_id);
              return (
                <Text key={p.id} style={{ color: '#222', fontSize: 13 }}>
                  {player?.name} #{player?.jerseyNumber}: {p.runs} runs, {p.wickets} wickets, {p.catches} catches
                </Text>
              );
            })}
            <Text style={{ fontWeight: 'bold', color: '#E91E63', marginTop: 12 }}>{teams.team2.name} Scorecard</Text>
            <Text>Total Runs: {performances.filter(p => p.team_id === teams.team2.id).reduce((sum, p) => sum + (p.runs || 0), 0)} | Wickets: {performances.filter(p => p.team_id === teams.team2.id).reduce((sum, p) => sum + (p.wickets || 0), 0)}</Text>
            {performances.filter(p => p.team_id === teams.team2.id).map(p => {
              const player = [...players.team1, ...players.team2].find(pl => pl.id === p.player_id);
              return (
                <Text key={p.id} style={{ color: '#222', fontSize: 13 }}>
                  {player?.name} #{player?.jerseyNumber}: {p.runs} runs, {p.wickets} wickets, {p.catches} catches
                </Text>
              );
            })}
            {/* MVP logic: most runs, then most wickets */}
            {performances.filter(p => p.status === 'confirmed').reduce((best, curr) => {
              if (!best) return curr;
              if ((curr.runs || 0) > (best.runs || 0)) return curr;
              if ((curr.runs || 0) === (best.runs || 0) && (curr.wickets || 0) > (best.wickets || 0)) return curr;
              return best;
            }, null) && (
              <Text style={{ marginTop: 16, fontWeight: 'bold', color: '#FFD700', fontSize: 16 }}>
                MVP: {performances.filter(p => p.status === 'confirmed').reduce((best, curr) => {
                  if (!best) return curr;
                  if ((curr.runs || 0) > (best.runs || 0)) return curr;
                  if ((curr.runs || 0) === (best.runs || 0) && (curr.wickets || 0) > (best.wickets || 0)) return curr;
                  return best;
                }, null)?.player_id && [...players.team1, ...players.team2].find(p => p.id === performances.filter(p => p.status === 'confirmed').reduce((best, curr) => {
                  if (!best) return curr;
                  if ((curr.runs || 0) > (best.runs || 0)) return curr;
                  if ((curr.runs || 0) === (best.runs || 0) && (curr.wickets || 0) > (best.wickets || 0)) return curr;
                  return best;
                }, null)?.player_id)?.name} #{performances.filter(p => p.status === 'confirmed').reduce((best, curr) => {
                  if (!best) return curr;
                  if ((curr.runs || 0) > (best.runs || 0)) return curr;
                  if ((curr.runs || 0) === (best.runs || 0) && (curr.wickets || 0) > (best.wickets || 0)) return curr;
                  return best;
                }, null)?.player_id && [...players.team1, ...players.team2].find(p => p.id === performances.filter(p => p.status === 'confirmed').reduce((best, curr) => {
                  if (!best) return curr;
                  if ((curr.runs || 0) > (best.runs || 0)) return curr;
                  if ((curr.runs || 0) === (best.runs || 0) && (curr.wickets || 0) > (best.wickets || 0)) return curr;
                  return best;
                }, null)?.player_id)?.jerseyNumber} ({performances.filter(p => p.status === 'confirmed').reduce((best, curr) => {
                  if (!best) return curr;
                  if ((curr.runs || 0) > (best.runs || 0)) return curr;
                  if ((curr.runs || 0) === (best.runs || 0) && (curr.wickets || 0) > (best.wickets || 0)) return curr;
                  return best;
                }, null)?.runs} runs, {performances.filter(p => p.status === 'confirmed').reduce((best, curr) => {
                  if (!best) return curr;
                  if ((curr.runs || 0) > (best.runs || 0)) return curr;
                  if ((curr.runs || 0) === (best.runs || 0) && (curr.wickets || 0) > (best.wickets || 0)) return curr;
                  return best;
                }, null)?.wickets} wickets)
              </Text>
            )}
            {/* You can add winner logic here if you have it */}
          </View>
        )}

        {/* Team 1 Players */}
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: 8, marginBottom: 4, color: '#2196F3' }}>{teams.team1.name} Players</Text>
        {players.team1.map(player => (
          <PlayerCard key={player.id} player={player} teamColor="#2196F3" />
        ))}

        {/* Team 2 Players */}
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: 18, marginBottom: 4, color: '#E91E63' }}>{teams.team2.name} Players</Text>
        {players.team2.map(player => (
          <PlayerCard key={player.id} player={player} teamColor="#E91E63" />
        ))}

        {(teams.team1.captainId === user.id || teams.team2.captainId === user.id) && (
          <View style={{ marginTop: 24, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 17, marginBottom: 10 }}>Pending Player Stats for Approval</Text>
            {performances.filter(p => p.status === 'submitted').length === 0 && (
              <Text style={{ color: '#888' }}>No pending submissions.</Text>
            )}
            {performances.filter(p => p.status === 'submitted').map(p => {
              const player = [...players.team1, ...players.team2].find(pl => pl.id === p.player_id);
              if (!player) return null;
              return (
                <View key={p.id} style={{ marginBottom: 16, borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 10 }}>
                  <Text style={{ fontWeight: 'bold' }}>{player.name} #{player.jerseyNumber}</Text>
                  <Text>Runs: {p.runs} | Wickets: {p.wickets} | Catches: {p.catches}</Text>
                  <Text>Strike Rate: {p.strike_rate} | Economy: {p.economy_rate}</Text>
                  <Text>Remarks: {p.remarks}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <TouchableOpacity
                      style={{ backgroundColor: '#4cd137', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 8, marginRight: 10 }}
                      onPress={() => handleApprove(p, true)}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ backgroundColor: '#f77f1b', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 8 }}
                      onPress={() => handleRejectPrompt(p)}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Analytics Modal */}
      <Modal visible={showAnalyticsModal} animationType="slide" onRequestClose={() => setShowAnalyticsModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 18 }}>My Performance</Text>
          {inputLocked ? (
            <>
              <Text style={{ color: '#888', marginBottom: 12 }}>Input locked. Status: {inputStatus}</Text>
              {inputFeedback ? <Text style={{ color: 'red', marginBottom: 12 }}>Feedback: {inputFeedback}</Text> : null}
              <Text>Runs: {inputStats.runs}</Text>
              <Text>Wickets: {inputStats.wickets}</Text>
              <Text>Catches: {inputStats.catches}</Text>
              <Text>Strike Rate: {inputStats.strike_rate}</Text>
              <Text>Economy Rate: {inputStats.economy_rate}</Text>
              <Text>Remarks: {inputStats.remarks}</Text>
            </>
          ) : (
            <>
              <TextInput
                placeholder="Runs"
                value={inputStats.runs}
                onChangeText={v => setInputStats(s => ({ ...s, runs: v }))}
                keyboardType="numeric"
                style={{ borderBottomWidth: 1, marginBottom: 12 }}
              />
              <TextInput
                placeholder="Wickets"
                value={inputStats.wickets}
                onChangeText={v => setInputStats(s => ({ ...s, wickets: v }))}
                keyboardType="numeric"
                style={{ borderBottomWidth: 1, marginBottom: 12 }}
              />
              <TextInput
                placeholder="Catches"
                value={inputStats.catches}
                onChangeText={v => setInputStats(s => ({ ...s, catches: v }))}
                keyboardType="numeric"
                style={{ borderBottomWidth: 1, marginBottom: 12 }}
              />
              <TextInput
                placeholder="Strike Rate"
                value={inputStats.strike_rate}
                onChangeText={v => setInputStats(s => ({ ...s, strike_rate: v }))}
                keyboardType="numeric"
                style={{ borderBottomWidth: 1, marginBottom: 12 }}
              />
              <TextInput
                placeholder="Economy Rate"
                value={inputStats.economy_rate}
                onChangeText={v => setInputStats(s => ({ ...s, economy_rate: v }))}
                keyboardType="numeric"
                style={{ borderBottomWidth: 1, marginBottom: 12 }}
              />
              <TextInput
                placeholder="Remarks (optional)"
                value={inputStats.remarks}
                onChangeText={v => setInputStats(s => ({ ...s, remarks: v }))}
                style={{ borderBottomWidth: 1, marginBottom: 18 }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }}>
                <TouchableOpacity
                  style={{ backgroundColor: '#FFD700', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12 }}
                  onPress={() => handleSaveOrSubmit(false)}
                >
                  <Text style={{ color: '#222', fontWeight: 'bold' }}>Save Draft</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ backgroundColor: '#4cd137', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12 }}
                  onPress={() => handleSaveOrSubmit(true)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Submit</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          <TouchableOpacity onPress={() => setShowAnalyticsModal(false)} style={{ marginTop: 28, alignSelf: 'center' }}>
            <Text style={{ color: 'red' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
} 