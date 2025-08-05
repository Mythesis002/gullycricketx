import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, FlatList, ScrollView, SafeAreaView, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabaseClient';

const TABS = ['Summary', 'Batting', 'Bowling', 'Ball-by-Ball', 'Squads'];

export default function ScorecardScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { matchId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Summary');
  const [match, setMatch] = useState(null);
  const [batting, setBatting] = useState([]);
  const [bowling, setBowling] = useState([]);
  const [balls, setBalls] = useState([]);
     const [teams, setTeams] = useState({});
   const [players, setPlayers] = useState({});
  const [error, setError] = useState(null);
   const [squads, setSquads] = useState({ team1: [], team2: [] });

  useEffect(() => {
    fetchScorecard();
  }, [matchId]);

   // Refetch teams when match data is available
   useEffect(() => {
     if (match && Object.keys(teams).length === 0) {
       fetchTeams();
     }
   }, [match]);

   const fetchTeams = async () => {
     if (!match) return;
     
     const team1Id = match.team1_id;
     const team2Id = match.team2_id;
     
     console.log('[SCORECARD] Refetching teams:', { team1Id, team2Id });
     
     if (team1Id && team2Id) {
       // Fetch both teams in one query with correct field names
       const { data: teamsData, error: teamsError } = await supabase
         .from('teams')
         .select('id, name, logo_url, players')
         .in('id', [team1Id, team2Id])
         .eq('is_deleted', false);
       
       if (teamsError) {
         console.error('[SCORECARD] Error refetching teams:', teamsError);
         return;
       }
       
       console.log('[SCORECARD] Raw teams data (refetch):', teamsData);
       
       const teamsMap = {};
       if (teamsData && teamsData.length > 0) {
         teamsData.forEach(team => {
           teamsMap[team.id] = team;
           console.log(`[SCORECARD] Team ${team.id} (refetch):`, team);
         });
       }
       
       setTeams(teamsMap);
       
       console.log('[SCORECARD] Teams refetched:', {
         team1Data: teamsMap[team1Id],
         team2Data: teamsMap[team2Id],
         team1Name: teamsMap[team1Id]?.name || 'Unknown',
         team2Name: teamsMap[team2Id]?.name || 'Unknown'
       });
     }
   };

  const fetchScorecard = async () => {
    setLoading(true);
    setError(null);
    console.log('[SCORECARD] Fetching scorecard for matchId:', matchId);
    
    try {
      // Fetch match details
      const { data: matchData } = await supabase.from('matches').select('*').eq('id', matchId).single();
      if (!matchData) {
        // Try tournament_matches
        const { data: tournamentMatchData } = await supabase.from('tournament_matches').select('*').eq('id', matchId).single();
        if (tournamentMatchData) {
          setMatch({
            ...tournamentMatchData,
            team1_id: tournamentMatchData.team_a_id,
            team2_id: tournamentMatchData.team_b_id,
            isTournamentMatch: true
          });
        }
      } else {
        setMatch(matchData);
      }

             // Fetch team details
       if (matchData || match) {
         const team1Id = matchData?.team1_id || match?.team1_id;
         const team2Id = matchData?.team2_id || match?.team2_id;
         
         console.log('[SCORECARD] Team IDs found:', { team1Id, team2Id });
         
         if (team1Id && team2Id) {
           console.log('[SCORECARD] About to fetch teams with IDs:', [team1Id, team2Id]);
           
           // First, let's check if these teams exist in the database
           const { data: allTeams, error: allTeamsError } = await supabase
             .from('teams')
             .select('id, name')
             .eq('is_deleted', false);
           
           console.log('[SCORECARD] All teams in database:', allTeams);
           console.log('[SCORECARD] Looking for teams:', team1Id, team2Id);
           console.log('[SCORECARD] Found teams:', allTeams?.filter(t => t.id === team1Id || t.id === team2Id));
           
           // Fetch both teams in one query with correct field names
           const { data: teamsData, error: teamsError } = await supabase
             .from('teams')
             .select('id, name, logo_url, players')
             .in('id', [team1Id, team2Id])
             .eq('is_deleted', false);
           
           console.log('[SCORECARD] Supabase response:', { teamsData, teamsError });
           
           if (teamsError) {
             console.error('[SCORECARD] Error fetching teams:', teamsError);
           }
           
           console.log('[SCORECARD] Raw teams data:', teamsData);
           console.log('[SCORECARD] Teams data length:', teamsData?.length || 0);
           
           const teamsMap = {};
           if (teamsData && teamsData.length > 0) {
             teamsData.forEach(team => {
               teamsMap[team.id] = team;
               console.log(`[SCORECARD] Team ${team.id}:`, team);
             });
           } else {
             console.log('[SCORECARD] No teams data returned from database');
           }
           
           console.log('[SCORECARD] Final teamsMap before setState:', teamsMap);
           setTeams(teamsMap);
           
           console.log('[SCORECARD] Teams loaded:', {
             team1Id,
             team2Id,
             team1Data: teamsMap[team1Id],
             team2Data: teamsMap[team2Id],
             team1Name: teamsMap[team1Id]?.name || 'Unknown',
             team2Name: teamsMap[team2Id]?.name || 'Unknown',
             teamsMap
           });
         } else {
           console.log('[SCORECARD] No team IDs found in match data');
         }
       }

      // Fetch performance data
      const { data: bat } = await supabase.from('match_performances').select('*').eq('match_id', matchId).order('batting_position');
      const { data: bowl } = await supabase.from('match_performances').select('*').eq('match_id', matchId).order('bowling_position');
      const { data: ballRows } = await supabase.from('ball_by_ball').select('*').eq('match_id', matchId).order('over,ball');
      
             console.log('[SCORECARD] Data fetched:', {
         matchId,
         matchData: !!matchData,
         battingCount: bat?.length || 0,
         bowlingCount: bowl?.length || 0,
         ballsCount: ballRows?.length || 0,
         team1Id: matchData?.team1_id || match?.team1_id,
         team2Id: matchData?.team2_id || match?.team2_id
       });
      
      setBatting(bat || []);
      setBowling(bowl || []);
      setBalls(ballRows || []);
       
       // Fetch player information for all players involved in the match
       const allPlayerIds = new Set();
       
       // Add players from ball-by-ball data
       ballRows?.forEach(ball => {
         if (ball.batsman_id) allPlayerIds.add(ball.batsman_id);
         if (ball.bowler_id) allPlayerIds.add(ball.bowler_id);
         if (ball.fielder_id) allPlayerIds.add(ball.fielder_id);
       });
       
       // Add players from performance data
       bat?.forEach(perf => {
         if (perf.player_id) allPlayerIds.add(perf.player_id);
       });
       
       bowl?.forEach(perf => {
         if (perf.player_id) allPlayerIds.add(perf.player_id);
       });
       
       if (allPlayerIds.size > 0) {
         const playerIdsArray = Array.from(allPlayerIds);
         const { data: playersData } = await supabase
           .from('users')
           .select('id, name, profilePicture')
           .in('id', playerIdsArray);
         
         const playersMap = {};
         (playersData || []).forEach(player => {
           playersMap[player.id] = player;
         });
         setPlayers(playersMap);
         
         console.log('[SCORECARD] Players loaded:', {
           totalPlayers: playerIdsArray.length,
           playersFound: playersData?.length || 0
         });
       }

             // Fetch squad information
       if (matchData || match) {
         const team1Id = matchData?.team1_id || match?.team1_id;
         const team2Id = matchData?.team2_id || match?.team2_id;
         
         if (team1Id && team2Id) {
           try {
             // Fetch team players
             const { data: team1Players } = await supabase.from('teams').select('players').eq('id', team1Id).single();
             const { data: team2Players } = await supabase.from('teams').select('players').eq('id', team2Id).single();
             
             // Parse and validate squad data
             let team1Squad = [];
             let team2Squad = [];
             
             if (team1Players?.players) {
               try {
                 team1Squad = typeof team1Players.players === 'string' 
                   ? JSON.parse(team1Players.players) 
                   : team1Players.players;
                 if (!Array.isArray(team1Squad)) team1Squad = [];
               } catch (e) {
                 console.log('[SCORECARD] Error parsing team1 players:', e);
                 team1Squad = [];
               }
             }
             
             if (team2Players?.players) {
               try {
                 team2Squad = typeof team2Players.players === 'string' 
                   ? JSON.parse(team2Players.players) 
                   : team2Players.players;
                 if (!Array.isArray(team2Squad)) team2Squad = [];
               } catch (e) {
                 console.log('[SCORECARD] Error parsing team2 players:', e);
                 team2Squad = [];
               }
             }
             
             setSquads({
               team1: team1Squad,
               team2: team2Squad
             });
             
             console.log('[SCORECARD] Squad data loaded:', {
               team1Count: team1Squad.length,
               team2Count: team2Squad.length
             });
           } catch (e) {
             console.error('[SCORECARD] Error fetching squad data:', e);
             setSquads({ team1: [], team2: [] });
           }
         }
       }
    } catch (e) {
      console.error('[SCORECARD] Error fetching scorecard:', e);
      setError('Failed to load scorecard');
    } finally {
      setLoading(false);
    }
  };

        // Calculate match summary
   const getMatchSummary = () => {
     if (!match) return null;

     console.log('[SCORECARD] getMatchSummary - teams state:', teams);
     console.log('[SCORECARD] getMatchSummary - match data:', {
       team1_id: match.team1_id,
       team2_id: match.team2_id
     });

     const team1 = teams[match.team1_id];
     const team2 = teams[match.team2_id];
     
     console.log('[SCORECARD] getMatchSummary - team objects:', {
       team1,
       team2
     });
     
     console.log('[SCORECARD] getMatchSummary:', {
       matchTeam1Id: match.team1_id,
       matchTeam2Id: match.team2_id,
       team1Data: team1,
       team2Data: team2,
       teamsState: teams,
       team1Name: team1?.name || 'Team A',
       team2Name: team2?.name || 'Team B'
     });
     
     // Calculate scores from ball-by-ball data
     const team1Balls = balls.filter(b => b.batting_team_id === match.team1_id);
     const team2Balls = balls.filter(b => b.batting_team_id === match.team2_id);
     
     const team1Runs = team1Balls.reduce((sum, b) => sum + (Number(b.runs) || 0) + (Number(b.extras) || 0), 0);
     const team2Runs = team2Balls.reduce((sum, b) => sum + (Number(b.runs) || 0) + (Number(b.extras) || 0), 0);
     
     const team1Wickets = team1Balls.filter(b => b.wicket).length;
     const team2Wickets = team2Balls.filter(b => b.wicket).length;
     
     const team1Overs = Math.floor(team1Balls.length / 6) + (team1Balls.length % 6) / 10;
     const team2Overs = Math.floor(team2Balls.length / 6) + (team2Balls.length % 6) / 10;
 
     return {
       team1: { 
         name: team1?.name || `Team ID: ${match.team1_id}` || 'Team A', 
         runs: team1Runs, 
         wickets: team1Wickets, 
         overs: team1Overs 
       },
       team2: { 
         name: team2?.name || `Team ID: ${match.team2_id}` || 'Team B', 
         runs: team2Runs, 
         wickets: team2Wickets, 
         overs: team2Overs 
       },
       result: match.result || 'Match completed',
       winner: match.winner_name || 'TBD',
       mvp: match.mvp || 'Not announced'
     };
   };

     // Calculate batting statistics
   const getBattingStats = () => {
     const stats = {};
     
     // First, use match_performances data if available (more accurate)
     batting.forEach(perf => {
       const playerId = perf.player_id;
       if (playerId) {
         stats[playerId] = {
           runs: Number(perf.runs_scored) || 0,
           balls: Number(perf.balls_faced) || 0,
           fours: Number(perf.fours) || 0,
           sixes: Number(perf.sixes) || 0,
           strike_rate: perf.strike_rate || '0.00',
           how_out: perf.how_out || 'Not out'
         };
       }
     });
     
     // If no performance data, calculate from ball-by-ball data
     if (Object.keys(stats).length === 0) {
       balls.forEach(ball => {
         const batsmanId = ball.batsman_id;
         if (!stats[batsmanId]) {
           stats[batsmanId] = {
             runs: 0,
             balls: 0,
             fours: 0,
             sixes: 0,
             strike_rate: 0,
             how_out: 'Not out'
           };
         }
         stats[batsmanId].runs += Number(ball.runs) || 0;
         stats[batsmanId].balls += 1;
         if (ball.runs === 4) stats[batsmanId].fours += 1;
         if (ball.runs === 6) stats[batsmanId].sixes += 1;
         if (ball.wicket) {
           stats[batsmanId].how_out = ball.how_out || 'Bowled';
         }
       });

       // Calculate strike rates for ball-by-ball data
       Object.keys(stats).forEach(batsmanId => {
         const stat = stats[batsmanId];
         stat.strike_rate = stat.balls > 0 ? ((stat.runs / stat.balls) * 100).toFixed(2) : '0.00';
       });
     }

     return stats;
   };

     // Calculate bowling statistics
   const getBowlingStats = () => {
     const stats = {};
     
     // First, use match_performances data if available (more accurate)
     bowling.forEach(perf => {
       const playerId = perf.player_id;
       if (playerId) {
         stats[playerId] = {
           overs: Number(perf.overs_bowled) || 0,
           runs: Number(perf.runs_conceded) || 0,
           wickets: Number(perf.wickets_taken) || 0,
           economy: perf.economy || '0.00',
           maidens: Number(perf.maidens) || 0
         };
       }
     });
     
     // If no performance data, calculate from ball-by-ball data
     if (Object.keys(stats).length === 0) {
       balls.forEach(ball => {
         const bowlerId = ball.bowler_id;
         if (!stats[bowlerId]) {
           stats[bowlerId] = {
             overs: 0,
             runs: 0,
             wickets: 0,
             economy: 0,
             maidens: 0
           };
         }
         stats[bowlerId].runs += Number(ball.runs) || 0;
         stats[bowlerId].runs += Number(ball.extras) || 0;
         if (ball.wicket) stats[bowlerId].wickets += 1;
       });

       // Calculate overs and economy for ball-by-ball data
       Object.keys(stats).forEach(bowlerId => {
         const stat = stats[bowlerId];
         const totalBalls = balls.filter(b => b.bowler_id === bowlerId).length;
         stat.overs = Math.floor(totalBalls / 6) + (totalBalls % 6) / 10;
         stat.economy = stat.overs > 0 ? (stat.runs / stat.overs).toFixed(2) : '0.00';
       });
     }

     return stats;
  };

  // FOW
  const getFOW = () => balls.filter(b => b.wicket).map(b => ({ 
    over: b.over, 
    ball: b.ball, 
    batsman: b.batsman_id, 
    score: b.runs,
    team: b.batting_team_id === match?.team1_id ? 'team1' : 'team2'
  }));

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loading Scorecard...</Text>
      </View>
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    </SafeAreaView>
  );

  if (error) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scorecard</Text>
      </View>
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    </SafeAreaView>
  );

  if (!matchId) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scorecard</Text>
      </View>
      <View style={styles.center}>
        <Text style={styles.errorText}>No match ID provided</Text>
      </View>
    </SafeAreaView>
  );

  const summary = getMatchSummary();
  const battingStats = getBattingStats();
  const bowlingStats = getBowlingStats();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Scorecard</Text>
      </View>

      {/* Match Summary Header */}
      {summary && (
        <View style={styles.matchHeader}>
          <View style={styles.teamRow}>
            <View style={styles.teamInfo}>
              <Text style={styles.teamName}>{summary.team1.name}</Text>
              <Text style={styles.teamScore}>{summary.team1.runs}/{summary.team1.wickets}</Text>
              <Text style={styles.teamOvers}>({summary.team1.overs.toFixed(1)} overs)</Text>
            </View>
            <Text style={styles.vs}>vs</Text>
            <View style={styles.teamInfo}>
              <Text style={styles.teamName}>{summary.team2.name}</Text>
              <Text style={styles.teamScore}>{summary.team2.runs}/{summary.team2.wickets}</Text>
              <Text style={styles.teamOvers}>({summary.team2.overs.toFixed(1)} overs)</Text>
            </View>
          </View>
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>{summary.result}</Text>
            {summary.winner !== 'TBD' && (
              <Text style={styles.winnerText}>Winner: {summary.winner}</Text>
            )}
            {summary.mvp !== 'Not announced' && (
              <View style={styles.mvpContainer}>
                <Ionicons name="trophy" size={16} color="#FFD700" />
                <Text style={styles.mvpText}>Man of the Match: {summary.mvp}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map(t => (
          <TouchableOpacity 
            key={t} 
            style={[styles.tab, tab === t && styles.activeTab]} 
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content}>
        {tab === 'Summary' && (
          <View style={styles.summaryContainer}>
            <Text style={styles.sectionTitle}>Match Summary</Text>
            {summary && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Result:</Text>
                  <Text style={styles.summaryValue}>{summary.result}</Text>
                </View>
                {summary.winner !== 'TBD' && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Winner:</Text>
                    <Text style={styles.summaryValue}>{summary.winner}</Text>
                  </View>
                )}
                {summary.mvp !== 'Not announced' && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Man of the Match:</Text>
                    <Text style={styles.summaryValue}>{summary.mvp}</Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Balls:</Text>
                  <Text style={styles.summaryValue}>{balls.length}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Wickets:</Text>
                  <Text style={styles.summaryValue}>{balls.filter(b => b.wicket).length}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Match Type:</Text>
                  <Text style={styles.summaryValue}>{match?.match_type || 'Regular'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Overs per Innings:</Text>
                  <Text style={styles.summaryValue}>{match?.overs || 'Not specified'}</Text>
                </View>
              </View>
            )}
          </View>
        )}

      {tab === 'Batting' && (
          <View style={styles.battingContainer}>
            <Text style={styles.sectionTitle}>Batting Statistics</Text>
            {Object.keys(battingStats).length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No batting data available</Text>
                <Text style={styles.emptySubtext}>Detailed batting statistics not recorded</Text>
              </View>
            ) : (
              <>
                                 {/* Batting Header */}
                 <View style={styles.statsHeader}>
                   <Text style={styles.statsHeaderText}>Batsman</Text>
                   <Text style={styles.statsHeaderText}>R</Text>
                   <Text style={styles.statsHeaderText}>B</Text>
                   <Text style={styles.statsHeaderText}>4s</Text>
                   <Text style={styles.statsHeaderText}>6s</Text>
                   <Text style={styles.statsHeaderText}>SR</Text>
                   <Text style={styles.statsHeaderText}>Status</Text>
                 </View>
                                  {Object.entries(battingStats).map(([playerId, stats], idx) => {
                    const player = players[playerId];
                    const playerName = player?.name || playerId;
                    
                    return (
                      <View key={playerId} style={styles.statsRow}>
                        <View style={styles.playerInfoCell}>
                          {player?.profilePicture ? (
                            <Image 
                              source={{ uri: player.profilePicture }} 
                              style={styles.playerAvatar}
                            />
                          ) : (
                            <View style={styles.playerAvatarPlaceholder}>
                              <Text style={styles.playerAvatarText}>
                                {playerName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <Text style={styles.statsPlayerName}>{playerName}</Text>
                        </View>
                        <Text style={styles.statsValue}>{stats.runs}</Text>
                        <Text style={styles.statsValue}>{stats.balls}</Text>
                        <Text style={styles.statsValue}>{stats.fours}</Text>
                        <Text style={styles.statsValue}>{stats.sixes}</Text>
                        <Text style={styles.statsValue}>{stats.strike_rate}</Text>
                        <Text style={[styles.statsValue, styles.statusText]}>{stats.how_out}</Text>
                      </View>
                    );
                  })}
              </>
            )}
            </View>
      )}

      {tab === 'Bowling' && (
          <View style={styles.bowlingContainer}>
            <Text style={styles.sectionTitle}>Bowling Statistics</Text>
            {Object.keys(bowlingStats).length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No bowling data available</Text>
                <Text style={styles.emptySubtext}>Detailed bowling statistics not recorded</Text>
              </View>
            ) : (
              <>
                                 {/* Bowling Header */}
                 <View style={styles.statsHeader}>
                   <Text style={styles.statsHeaderText}>Bowler</Text>
                   <Text style={styles.statsHeaderText}>O</Text>
                   <Text style={styles.statsHeaderText}>R</Text>
                   <Text style={styles.statsHeaderText}>W</Text>
                   <Text style={styles.statsHeaderText}>M</Text>
                   <Text style={styles.statsHeaderText}>Econ</Text>
                 </View>
                                  {Object.entries(bowlingStats).map(([playerId, stats], idx) => {
                    const player = players[playerId];
                    const playerName = player?.name || playerId;
                    
                    return (
                      <View key={playerId} style={styles.statsRow}>
                        <View style={styles.playerInfoCell}>
                          {player?.profilePicture ? (
                            <Image 
                              source={{ uri: player.profilePicture }} 
                              style={styles.playerAvatar}
                            />
                          ) : (
                            <View style={styles.playerAvatarPlaceholder}>
                              <Text style={styles.playerAvatarText}>
                                {playerName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <Text style={styles.statsPlayerName}>{playerName}</Text>
                        </View>
                        <Text style={styles.statsValue}>{stats.overs.toFixed(1)}</Text>
                        <Text style={styles.statsValue}>{stats.runs}</Text>
                        <Text style={styles.statsValue}>{stats.wickets}</Text>
                        <Text style={styles.statsValue}>{stats.maidens || 0}</Text>
                        <Text style={styles.statsValue}>{stats.economy}</Text>
            </View>
                    );
                  })}
              </>
            )}
            </View>
      )}

      {tab === 'Ball-by-Ball' && (
          <View style={styles.ballByBallContainer}>
            <Text style={styles.sectionTitle}>Ball-by-Ball Commentary</Text>
            {balls.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No ball-by-ball data available</Text>
                <Text style={styles.emptySubtext}>Detailed ball-by-ball scoring not recorded</Text>
                <Text style={styles.matchIdText}>Match ID: {matchId}</Text>
              </View>
            ) : (
                             balls.map((b, idx) => {
                 const batsman = players[b.batsman_id];
                 const bowler = players[b.bowler_id];
                 const batsmanName = batsman?.name || b.batsman_id;
                 const bowlerName = bowler?.name || b.bowler_id;
                 
                 return (
                   <View key={b.id || idx} style={styles.ballRow}>
                     <Text style={styles.ballNumber}>{b.over}.{b.ball}</Text>
                     <View style={styles.ballDetails}>
                       <Text style={styles.ballInfo}>
                         {b.runs || 0} runs {b.extras > 0 ? `(${b.extras} extras)` : ''} {b.wicket ? '• WICKET!' : ''}
                       </Text>
                       <Text style={styles.ballPlayers}>
                         {batsmanName} • {bowlerName}
                       </Text>
                     </View>
                   </View>
                 );
               })
            )}
          </View>
        )}

        {tab === 'Squads' && (
          <View style={styles.squadsContainer}>
            <Text style={styles.sectionTitle}>Match Squads</Text>
            
                         {/* Team 1 Squad */}
             <View style={styles.squadSection}>
               <Text style={styles.squadTitle}>{summary?.team1.name || 'Team A'} Squad</Text>
               {!Array.isArray(squads.team1) || squads.team1.length === 0 ? (
                 <Text style={styles.noSquadText}>Squad information not available</Text>
               ) : (
                 squads.team1.map((player, idx) => {
                   const playerData = players[player.id || player.user_id];
                   const playerName = playerData?.name || player.name || player.id || `Player ${idx + 1}`;
                   
                   return (
                     <View key={idx} style={styles.squadPlayer}>
                       <View style={styles.squadPlayerInfo}>
                         {playerData?.profilePicture ? (
                           <Image 
                             source={{ uri: playerData.profilePicture }} 
                             style={styles.squadPlayerAvatar}
                           />
                         ) : (
                           <View style={styles.squadPlayerAvatarPlaceholder}>
                             <Text style={styles.squadPlayerAvatarText}>
                               {playerName.charAt(0).toUpperCase()}
                             </Text>
                           </View>
                         )}
                         <Text style={styles.squadPlayerName}>{playerName}</Text>
                       </View>
                       {player.role && <Text style={styles.squadPlayerRole}>{player.role}</Text>}
                     </View>
                   );
                 })
               )}
             </View>

             {/* Team 2 Squad */}
             <View style={styles.squadSection}>
               <Text style={styles.squadTitle}>{summary?.team2.name || 'Team B'} Squad</Text>
               {!Array.isArray(squads.team2) || squads.team2.length === 0 ? (
                 <Text style={styles.noSquadText}>Squad information not available</Text>
               ) : (
                 squads.team2.map((player, idx) => {
                   const playerData = players[player.id || player.user_id];
                   const playerName = playerData?.name || player.name || player.id || `Player ${idx + 1}`;
                   
                   return (
                     <View key={idx} style={styles.squadPlayer}>
                       <View style={styles.squadPlayerInfo}>
                         {playerData?.profilePicture ? (
                           <Image 
                             source={{ uri: playerData.profilePicture }} 
                             style={styles.squadPlayerAvatar}
                           />
                         ) : (
                           <View style={styles.squadPlayerAvatarPlaceholder}>
                             <Text style={styles.squadPlayerAvatarText}>
                               {playerName.charAt(0).toUpperCase()}
                             </Text>
                           </View>
                         )}
                         <Text style={styles.squadPlayerName}>{playerName}</Text>
                       </View>
                       {player.role && <Text style={styles.squadPlayerRole}>{player.role}</Text>}
            </View>
                   );
                 })
      )}
    </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  matchHeader: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teamInfo: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  teamScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 2,
  },
  teamOvers: {
    fontSize: 14,
    color: '#666',
  },
  vs: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginHorizontal: 16,
  },
  resultContainer: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  resultText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  winnerText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  mvpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  mvpText: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  battingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  bowlingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  ballByBallContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  squadsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  squadSection: {
    marginBottom: 20,
  },
  squadTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  squadPlayer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  squadPlayerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  squadPlayerRole: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  noSquadText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  playerStats: {
    fontSize: 14,
    color: '#666',
  },
  playerStrikeRate: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  playerEconomy: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  ballRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ballNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    width: 50,
  },
  ballDetails: {
    flex: 1,
    marginLeft: 12,
  },
  ballInfo: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  ballPlayers: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  matchIdText: {
    fontSize: 12,
    color: '#ccc',
    fontFamily: 'monospace',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e53935',
    textAlign: 'center',
  },
  statsHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  statsHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statsPlayerName: {
    flex: 2,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
     statsValue: {
     flex: 1,
     fontSize: 14,
     color: '#666',
     textAlign: 'center',
   },
   playerInfoCell: {
     flex: 2,
     flexDirection: 'row',
     alignItems: 'center',
   },
   playerAvatar: {
     width: 24,
     height: 24,
     borderRadius: 12,
     marginRight: 8,
   },
   playerAvatarPlaceholder: {
     width: 24,
     height: 24,
     borderRadius: 12,
     backgroundColor: '#2E7D32',
     justifyContent: 'center',
     alignItems: 'center',
     marginRight: 8,
   },
   playerAvatarText: {
     color: '#fff',
     fontSize: 12,
     fontWeight: 'bold',
   },
   squadPlayerInfo: {
     flexDirection: 'row',
     alignItems: 'center',
     flex: 1,
   },
   squadPlayerAvatar: {
     width: 32,
     height: 32,
     borderRadius: 16,
     marginRight: 12,
   },
   squadPlayerAvatarPlaceholder: {
     width: 32,
     height: 32,
     borderRadius: 16,
     backgroundColor: '#2E7D32',
     justifyContent: 'center',
     alignItems: 'center',
     marginRight: 12,
   },
       squadPlayerAvatarText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold',
    },
    statusText: {
      fontSize: 12,
      color: '#666',
      fontStyle: 'italic',
    },
}); 