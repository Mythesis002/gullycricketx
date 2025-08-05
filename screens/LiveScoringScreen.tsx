import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, FlatList, TextInput, Alert, Animated, ScrollView, Image } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../utils/supabaseClient';

// At the very top of the file, add:
const BOWLER_OVER_LIMIT = 2; // T20 max overs per bowler

// Dummy avatars for player highlights
const dummyAvatar = 'https://ui-avatars.com/api/?name=Player&background=random';

// At the top, add theme objects:
const THEME_1 = {
  bg: '#e3f2fd',
  header: '#1976D2',
  headerText: '#fff',
  btn: '#1976D2',
  btnText: '#fff',
};
const THEME_2 = {
  bg: '#ffebee',
  header: '#E53935',
  headerText: '#fff',
  btn: '#E53935',
  btnText: '#fff',
};

export default function LiveScoringScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { matchId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState(null);
  const [players, setPlayers] = useState([]);
  const [balls, setBalls] = useState([]);
  const [form, setForm] = useState({ striker: '', nonStriker: '', bowler: '', runs: '', extras: '', wicket: false, wicketType: '', fielder: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [activeTab, setActiveTab] = useState('quick'); // 'quick', 'advanced', 'chat'
  const [eventBadge, setEventBadge] = useState('');
  const [scoreAnim] = useState(new Animated.Value(0));
  const [tossInfo, setTossInfo] = useState({ winner: '', decision: '' });
  const [tossSubmitted, setTossSubmitted] = useState(false);
  const [requireBowlerChange, setRequireBowlerChange] = useState(false);
  const [lastOver, setLastOver] = useState(1);
  const [bowlerChangeModal, setBowlerChangeModal] = useState(false);
  const [currentBattingTeamId, setCurrentBattingTeamId] = useState(null);
  const [currentInnings, setCurrentInnings] = useState(1);
  const [showNewBatsmanModal, setShowNewBatsmanModal] = useState(false);
  const [pendingNewBatsman, setPendingNewBatsman] = useState(null);
  const [isTournamentMatch, setIsTournamentMatch] = useState(false);
  // Remove WicketSelectionModal and related state
  // Add state for outBatsmanSelection in the main component
  const [outBatsmanSelection, setOutBatsmanSelection] = useState('striker'); // 'striker' or 'nonStriker'
  // Add state for wicket flow
  const [showWhoIsOutModal, setShowWhoIsOutModal] = useState(false);
  const [whoIsOut, setWhoIsOut] = useState(null); // 'striker' or 'nonStriker'
  // Add state for modals and result
  const [showInningsModal, setShowInningsModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [isRealTimeUpdating, setIsRealTimeUpdating] = useState(false);

  // Debug: Log when currentInnings changes
  useEffect(() => {
    console.log('currentInnings changed to:', currentInnings);
  }, [currentInnings]);

  // Full fetch with spinner
  const fetchMatchFull = async () => {
    setLoading(true);
    await fetchMatchBackground();
    setLoading(false);
  };

  // Background fetch (no spinner)
  const fetchMatchBackground = async () => {
    try {
      // Try to fetch from 'matches' table first
      let m = null;
      let fetchError = null;
      let matchType = 'normal';
      let teamA = null, teamB = null;
      let teamAPlayers = [], teamBPlayers = [];
      let allPlayers = [];
      let teamAId = null, teamBId = null;
      let matchTable = 'matches';
      let tournament = null; // Add tournament variable
      let matchQuery = await supabase
        .from('matches')
        .select('*, team1:teams!team1_id(*), team2:teams!team2_id(*)')
        .eq('id', matchId)
        .single();
      m = matchQuery.data;
      fetchError = matchQuery.error;
      if (!m) {
        // Try tournament_matches as fallback
        matchTable = 'tournament_matches';
        matchQuery = await supabase
          .from('tournament_matches')
          .select('*, team_a:teams!team_a_id(*), team_b:teams!team_b_id(*)')
          .eq('id', matchId)
          .single();
        m = matchQuery.data;
        fetchError = matchQuery.error;
        matchType = 'tournament';
        setIsTournamentMatch(true);
        
        // Fetch tournament data for tournament matches
        if (m && m.tournament_id) {
          const { data: tournamentData } = await supabase
            .from('tournaments')
            .select('*')
            .eq('id', m.tournament_id)
            .single();
          tournament = tournamentData;
        }
      } else {
        setIsTournamentMatch(false);
      }
      if (fetchError && !m) {
        setError('Failed to load match: ' + fetchError.message);
        setMatch(null);
        setPlayers([]);
        setBalls([]);
        return;
      }
      setMatch(m);
      // Store tournament data in match object for easy access
      if (tournament) {
        m.tournament = tournament;
      }
      // Fetch players for both teams
      if (matchType === 'normal') {
        teamAId = m.team1_id;
        teamBId = m.team2_id;
        teamA = m.team1;
        teamB = m.team2;
      } else {
        teamAId = m.team_a_id;
        teamBId = m.team_b_id;
        teamA = m.team_a;
        teamB = m.team_b;
      }
      // Fetch players for both teams
      const { data: teamAPlayersData } = await supabase.from('teams').select('players').eq('id', teamAId).eq('is_deleted', false).single();
      const { data: teamBPlayersData } = await supabase.from('teams').select('players').eq('id', teamBId).eq('is_deleted', false).single();
      let aPlayers = teamAPlayersData?.players;
      let bPlayers = teamBPlayersData?.players;
      if (typeof aPlayers === 'string') aPlayers = JSON.parse(aPlayers);
      if (typeof bPlayers === 'string') bPlayers = JSON.parse(bPlayers);
      aPlayers = (aPlayers || []).map(p => ({ ...p, team_id: teamAId }));
      bPlayers = (bPlayers || []).map(p => ({ ...p, team_id: teamBId }));
      allPlayers = [...aPlayers, ...bPlayers];
      setPlayers(allPlayers);
      // Fetch balls
      const { data: ballRows } = await supabase.from('ball_by_ball').select('*').eq('match_id', matchId).order('over,ball');
      setBalls(ballRows || []);
      // Set currentBattingTeamId and currentInnings synchronously
      if (m) {
        let inferredBattingTeamId = m.current_batting_team_id;
        // PRESERVE currentInnings state - don't reset it from database
        // Only set it if it's not already set (first load)
        if (!inferredBattingTeamId && ballRows && ballRows.length > 0) {
        const firstBall = ballRows[0];
        const batsman = allPlayers.find(p => p.id === firstBall.batsman_id);
          if (batsman) inferredBattingTeamId = batsman.team_id;
        }
        setCurrentBattingTeamId(inferredBattingTeamId || null);
        // Only set currentInnings if it's not already set (preserve state)
        // NEVER reset currentInnings once it's set to 2 (second innings)
        if ((currentInnings === null || currentInnings === undefined) && currentInnings !== 2) {
          const newInnings = m.current_innings || 1;
          // Additional protection: never set to 1 if we're already in 2
          if (newInnings === 1 && currentInnings === 2) {
            console.log('PROTECTION: Preventing reset to inning 1');
            return;
          }
          setCurrentInnings(newInnings);
        }
      }
      // Animate score update
      Animated.sequence([
        Animated.timing(scoreAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(scoreAnim, { toValue: 0, duration: 300, useNativeDriver: true })
      ]).start();
    } catch (e) {
      setError('Failed to load match: ' + e.message);
    }
  };

  // useEffect for initial load and manual refresh
  useEffect(() => {
    fetchMatchFull();
  }, [matchId]);

  // Real-time subscription for ball-by-ball updates
  useEffect(() => {
    if (!matchId) return;

    console.log('[LIVE SCORING] Setting up real-time subscription for match:', matchId);
    
    const subscription = supabase
      .channel(`live-scoring-${matchId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'ball_by_ball',
        filter: `match_id=eq.${matchId}`
      }, (payload) => {
        console.log('[LIVE SCORING] Ball-by-ball change detected:', payload);
        
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
          console.log('[LIVE SCORING] Refreshing ball data...');
          // Show real-time update indicator
          setIsRealTimeUpdating(true);
          // Refresh ball data without showing loading spinner
          fetchMatchBackground().finally(() => {
            // Hide indicator after update
            setTimeout(() => setIsRealTimeUpdating(false), 2000);
          });
        }
      })
      .subscribe((status) => {
        console.log('[LIVE SCORING] Subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('[LIVE SCORING] Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [matchId]);

  // Helper function to get teams
  const getTeams = () => {
    if (!match) return { teamA: null, teamB: null };
    
    if (isTournamentMatch) {
      return {
        teamA: match.team_a,
        teamB: match.team_b
      };
    } else {
      return {
        teamA: match.team1,
        teamB: match.team2
      };
    }
  };

  // Monitor ball data for automatic innings changes and match end
  useEffect(() => {
    if (!balls.length || !match) return;

    console.log('[LIVE SCORING] Checking for innings/match end conditions...');
    
    const { teamA, teamB } = getTeams();
    
    // --- Automatic Innings Change and Match End ---
    if (!showResultModal && !showInningsModal) {
      console.log('Innings/Match end check - currentInnings:', currentInnings, 'isAllOut():', isAllOut(), 'isOversComplete():', isOversComplete());
      
      // FIRST INNINGS END CONDITIONS
      if (currentInnings === 1) {
        const firstInningsEnded = isAllOut() || isOversComplete();
        
        if (firstInningsEnded) {
          console.log('First innings complete - switching to second innings');
          setShowInningsModal(true);
          setTimeout(() => {
            setShowInningsModal(false);
            setCurrentInnings(2);
            // Switch batting team
            const newBattingTeamId = (currentBattingTeamId === teamA?.id) ? teamB?.id : teamA?.id;
            setCurrentBattingTeamId(newBattingTeamId);
            setForm({ striker: '', nonStriker: '', bowler: '', runs: '', extras: '', wicket: false, wicketType: '', fielder: '' });
          }, 2000);
          return;
        }
      }
      
      // SECOND INNINGS END CONDITIONS
      if (currentInnings === 2) {
        // Calculate first innings total (target)
        const firstInningsBalls = balls.filter(b => b.innings === 1);
        const firstInningsRuns = firstInningsBalls.reduce((sum, b) => sum + (Number(b.runs) || 0) + (Number(b.extras) || 0), 0);
        
        // Calculate second innings current total
        const secondInningsBalls = balls.filter(b => b.innings === 2);
        const secondInningsRuns = secondInningsBalls.reduce((sum, b) => sum + (Number(b.runs) || 0) + (Number(b.extras) || 0), 0);
        
        console.log('Second innings check - firstInningsRuns:', firstInningsRuns, 'secondInningsRuns:', secondInningsRuns);
        
        // Check all second innings end conditions
        const targetReached = firstInningsRuns > 0 && secondInningsRuns > firstInningsRuns;
        const secondInningsEnded = isAllOut() || isOversComplete();
        
        if (targetReached || secondInningsEnded) {
          console.log('Second innings complete - match ends');
          
          // Determine current batting and bowling teams
          const currentBattingTeam = currentBattingTeamId === teamA?.id ? teamA : teamB;
          const currentBowlingTeam = currentBattingTeamId === teamA?.id ? teamB : teamA;
          
          // --- MATCH END LOGIC ---
          let result = '';
          
          if (targetReached) {
            // Target chased - batting team wins
            const wicketsLost = getBattingStats().wickets;
            result = `${currentBattingTeam?.name} won by ${10 - wicketsLost} wickets!`;
          } else if (secondInningsRuns > firstInningsRuns) {
            // Second innings score exceeds target
            result = `${currentBattingTeam?.name} won by ${secondInningsRuns - firstInningsRuns} runs!`;
          } else if (secondInningsRuns < firstInningsRuns) {
            // Second innings score below target
            result = `${currentBowlingTeam?.name} won by ${firstInningsRuns - secondInningsRuns} runs!`;
          } else {
            // Scores are equal
            result = 'Match tied!';
          }
          
          setResultMessage(result);
          setShowResultModal(true);
          
          // Update match status to completed and save winner
          const updateMatchStatus = async () => {
            try {
              const winnerTeam = targetReached || secondInningsRuns > firstInningsRuns ? currentBattingTeam : currentBowlingTeam;
              
              // Create match update with available fields
              const matchUpdate = {
                status: 'completed',
                result: result
              };
              
              // Try to add winner fields if they exist in the database
              // If the columns don't exist, this will be ignored by the database
              try {
                matchUpdate.winner_id = winnerTeam?.id;
                matchUpdate.winner_name = winnerTeam?.name || 'Unknown Team';
              } catch (e) {
                console.log('Winner fields not available in database schema, using result field only');
              }
              
              // Update match in database
              if (isTournamentMatch) {
                await supabase.from('tournament_matches').update(matchUpdate).eq('id', matchId);
              } else {
                await supabase.from('matches').update(matchUpdate).eq('id', matchId);
              }
              
              console.log('Match completed - status updated:', matchUpdate);
            } catch (error) {
              console.error('Failed to update match status:', error);
              // Fallback: try updating with just status and result
              try {
                const fallbackUpdate = {
                  status: 'completed',
                  result: result
                };
                
                if (isTournamentMatch) {
                  await supabase.from('tournament_matches').update(fallbackUpdate).eq('id', matchId);
                } else {
                  await supabase.from('matches').update(fallbackUpdate).eq('id', matchId);
                }
                
                console.log('Match completed - fallback update successful');
              } catch (fallbackError) {
                console.error('Fallback update also failed:', fallbackError);
              }
            }
          };
          
          // Call the async function
          updateMatchStatus();
          
          return;
        }
      }
    }
  }, [balls, currentInnings, currentBattingTeamId, showResultModal, showInningsModal, match]);

  useEffect(() => {
    const checkOrganizer = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId || !match) {
        setIsOrganizer(false);
        return;
      }
      if (isTournamentMatch) {
        // Tournament match logic
        if (
          userId === match.organizer_id ||
          userId === match.team_a?.created_by ||
          userId === match.team_b?.created_by
        ) {
          setIsOrganizer(true);
          return;
        }
      } else {
        // Normal match logic
        if (
          userId === match.creatorid ||
          userId === match.created_by ||
          userId === match.team1?.created_by ||
          userId === match.team2?.created_by
        ) {
          setIsOrganizer(true);
          return;
        }
      }
      setIsOrganizer(false);
    };
    checkOrganizer();
  }, [match, isTournamentMatch]);

  // After fetching match, set currentBattingTeamId and currentInnings
  useEffect(() => {
    if (match) {
      // Use match.current_batting_team_id and match.current_innings if present
      // Don't reference battingTeam here as it's not defined yet
      setCurrentBattingTeamId(match.current_batting_team_id || null);
      setCurrentInnings(match.current_innings || 1);
    }
  }, [match]);

  // Button to switch innings
  const handleSwitchInnings = async () => {
    // Swap batting and bowling team
    const newBattingTeamId = (currentBattingTeamId === teamA?.id) ? teamB?.id : teamA?.id;
    const newInnings = currentInnings + 1;
    setCurrentBattingTeamId(newBattingTeamId);
    setCurrentInnings(newInnings);
    // Optionally, update match in DB (stubbed here)
    // await supabase.from('tournament_matches').update({ current_batting_team_id: newBattingTeamId, current_innings: newInnings }).eq('id', matchId);
  };

  // Determine teams for pickers based on toss and current innings
  let teamA = null, teamB = null;
  if (isTournamentMatch) {
    teamA = match?.team_a;
    teamB = match?.team_b;
  } else {
    teamA = match?.team1;
    teamB = match?.team2;
  }
  const teamAPlayers = players.filter(p => p.team_id === teamA?.id);
  const teamBPlayers = players.filter(p => p.team_id === teamB?.id);
  let battingTeam = null, bowlingTeam = null;
  
  if (isTournamentMatch) {
    if (match?.toss_decision || tossSubmitted) {
      const winner = match?.toss_winner || tossInfo.winner;
      const decision = match?.toss_decision || tossInfo.decision;
      if (winner && decision) {
        // Determine initial batting team based on toss
        let initialBattingTeam = null;
        if ((winner === teamA?.id && decision === 'Bat') || (winner === teamB?.id && decision === 'Bowl')) {
          initialBattingTeam = teamA;
        } else {
          initialBattingTeam = teamB;
        }
        
        // Swap teams based on current innings
        if (currentInnings === 1) {
          battingTeam = initialBattingTeam;
          bowlingTeam = initialBattingTeam === teamA ? teamB : teamA;
        } else {
          // Second innings: swap the teams
          battingTeam = initialBattingTeam === teamA ? teamB : teamA;
          bowlingTeam = initialBattingTeam;
        }
      }
    }
  } else {
    // Normal match: use toss_winner_team and toss_choice
    const winner = match?.toss_winner_team;
    const decision = match?.toss_choice;
    if (winner && decision) {
      // Determine initial batting team based on toss
      let initialBattingTeam = null;
      if ((winner === teamA?.id && decision === 'Bat') || (winner === teamB?.id && decision === 'Bowl')) {
        initialBattingTeam = teamA;
      } else {
        initialBattingTeam = teamB;
      }
      
      // Swap teams based on current innings
      if (currentInnings === 1) {
        battingTeam = initialBattingTeam;
        bowlingTeam = initialBattingTeam === teamA ? teamB : teamA;
      } else {
        // Second innings: swap the teams
        battingTeam = initialBattingTeam === teamA ? teamB : teamA;
        bowlingTeam = initialBattingTeam;
      }
    }
  }
  const battingPlayers = battingTeam ? players.filter(p => p.team_id === battingTeam.id) : [];
  const bowlingPlayers = bowlingTeam ? players.filter(p => p.team_id === bowlingTeam.id) : [];

  // Toss Decision Card
  const TossDecisionCard = () => (
    <View style={styles.tossCard}>
      <Text style={styles.sectionTitle}>Toss Decision</Text>
      <Text style={{ marginBottom: 8 }}>Who won the toss?</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}>
        {[teamA, teamB].map(team => (
          <TouchableOpacity
            key={team?.id}
            style={[styles.tossBtn, tossInfo.winner === team?.id && styles.selectedTossBtn]}
            onPress={() => setTossInfo(info => ({ ...info, winner: team?.id }))}
          >
            <Text style={styles.tossBtnText}>{team?.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={{ marginBottom: 8 }}>Decision:</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
        {['Bat', 'Bowl'].map(dec => (
          <TouchableOpacity
            key={dec}
            style={[styles.tossBtn, tossInfo.decision === dec && styles.selectedTossBtn]}
            onPress={() => setTossInfo(info => ({ ...info, decision: dec }))}
          >
            <Text style={styles.tossBtnText}>{dec}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.actionBtn, { opacity: tossInfo.winner && tossInfo.decision ? 1 : 0.5 }]}
        disabled={!(tossInfo.winner && tossInfo.decision)}
        onPress={async () => {
          if (!matchId) return;
          console.log('DEBUG: Submitting toss', { matchId, winner: tossInfo.winner, decision: tossInfo.decision });
          const { error } = await supabase.from('tournament_matches').update({
            toss_winner: tossInfo.winner,
            toss_decision: tossInfo.decision
          }).eq('id', matchId);
          if (error) {
            Alert.alert('Error', 'Failed to save toss result: ' + error.message);
            return;
          }
          setTossSubmitted(true);
          fetchMatch();
        }}
      >
        <Text style={styles.actionBtnText}>Submit Toss</Text>
      </TouchableOpacity>
    </View>
  );

  // --- UI Components ---
  // Helper to get balls for the current batting team and innings
  function getCurrentTeamBalls() {
    const filteredBalls = balls.filter(b =>
      String(b.batting_team_id) === String(currentBattingTeamId) &&
      (b.innings === undefined || b.innings === currentInnings)
    );
    
    console.log('getCurrentTeamBalls debug:', {
      currentInnings,
      currentBattingTeamId,
      totalBalls: balls.length,
      filteredBalls: filteredBalls.length,
      ballsWithInnings: balls.filter(b => b.innings !== undefined).length,
      ballsWithoutInnings: balls.filter(b => b.innings === undefined).length
    });
    
    return filteredBalls;
  }
  function isAllOut() {
    const teamBalls = getCurrentTeamBalls();
    let wickets = 0;
    teamBalls.forEach(b => { if (b.wicket) wickets += 1; });
    const teamSize = battingPlayers.length;
    return wickets >= teamSize - 1;
  }
  function isOversComplete() {
    const teamBalls = getCurrentTeamBalls();
    let legalBalls = teamBalls.filter(b => Number(b.extras) === 0).length;
    
    // Get total overs based on match type (same logic as HeaderCard)
    let maxOvers = 20; // Default fallback
    if (isTournamentMatch && match?.tournament?.overs_per_match) {
      maxOvers = match.tournament.overs_per_match;
    } else if (!isTournamentMatch && match?.overs) {
      maxOvers = match.overs;
    }
    
    // Debug logging
    console.log('isOversComplete debug:', {
      currentInnings,
      legalBalls,
      maxOvers,
      teamBallsCount: teamBalls.length,
      wouldComplete: Math.floor(legalBalls / 6) >= maxOvers
    });
    
    // Only check overs completion for the current innings
    // Each innings has its own overs limit
    return Math.floor(legalBalls / 6) >= maxOvers;
  }

  // Calculate current score, wickets, and overs for batting team
  function getBattingStats() {
    const teamBalls = getCurrentTeamBalls();
    let runs = 0, extras = 0, wickets = 0, totalBalls = 0;
    teamBalls.forEach(b => {
      runs += Number(b.runs) || 0;
      extras += Number(b.extras) || 0;
      if (b.wicket === true || b.wicket === 1) wickets += 1;
      if (Number(b.extras) === 0) totalBalls += 1;
    });
    const overs = `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;
    return { runs: runs + extras, wickets, overs };
  }

  const HeaderCard = () => {
    const { runs, wickets, overs } = getBattingStats();
    const winnerName = isTournamentMatch
      ? (match?.toss_winner === teamA?.id ? teamA?.name : match?.toss_winner === teamB?.id ? teamB?.name : '')
      : (match?.toss_winner_team === teamA?.id ? teamA?.name : match?.toss_winner_team === teamB?.id ? teamB?.name : '');
    const tossDecision = isTournamentMatch ? match?.toss_decision : match?.toss_choice;
    const tossDisplay = winnerName && tossDecision ? `${winnerName} won the toss and chose to ${tossDecision}` : 'Toss info here';
    const theme = currentInnings === 2 ? THEME_2 : THEME_1;
    
    // Get total overs based on match type
    let totalOvers = 20; // Default fallback
    if (isTournamentMatch && match?.tournament?.overs_per_match) {
      totalOvers = match.tournament.overs_per_match;
    } else if (!isTournamentMatch && match?.overs) {
      totalOvers = match.overs;
    }
    
    // Calculate target for second innings
    let target = null;
    let runsNeeded = null;
    if (currentInnings === 2) {
      // Get first innings balls - either with innings=1 or all balls before second innings started
      const firstInningsBalls = balls.filter(b => b.innings === 1 || (b.innings === undefined && b.batting_team_id !== currentBattingTeamId));
      const firstInningsRuns = firstInningsBalls.reduce((sum, b) => sum + (Number(b.runs) || 0) + (Number(b.extras) || 0), 0);
      target = firstInningsRuns;
      runsNeeded = Math.max(0, target - runs);
      console.log('Target calculation - firstInningsBalls:', firstInningsBalls.length, 'firstInningsRuns:', firstInningsRuns, 'target:', target, 'runsNeeded:', runsNeeded);
    }
    
    return (
      <View style={[styles.headerCard, { backgroundColor: theme.header }]}>
        {/* Real-time update indicator */}
        {isRealTimeUpdating && (
          <View style={styles.realTimeIndicator}>
            <Text style={[styles.realTimeText, { color: theme.headerText }]}>🔄 LIVE UPDATING...</Text>
          </View>
        )}
        {/* Debug line for verification */}
        <Text style={{ color: theme.headerText, fontSize: 12, marginBottom: 2 }}>DEBUG: Runs={runs}, Balls={overs}, Wickets={wickets}</Text>
        <Text style={[styles.tossText, { color: theme.headerText }]}>{tossDisplay}</Text>
        <View style={styles.scoreRow}>
          <View style={styles.teamCol}>
            <Text style={[styles.teamName, { color: theme.headerText }]}>{match.team_a?.name}</Text>
          </View>
          <Animated.View style={[styles.scoreBox, { transform: [{ scale: scoreAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }], backgroundColor: theme.header }] }>
            <Text style={[styles.scoreText, { color: theme.headerText }]}>{runs}/{wickets}</Text>
            <Text style={[styles.oversText, { color: theme.headerText }]}>Overs: {overs} / {totalOvers}</Text>
          </Animated.View>
          <View style={styles.teamCol}>
            <Text style={[styles.teamName, { color: theme.headerText }]}>{match.team_b?.name}</Text>
          </View>
        </View>
        {/* Target Banner for Second Innings */}
        {currentInnings === 2 && target && (
          <View style={[styles.targetBanner, { backgroundColor: theme.header }]}>
            <Text style={[styles.targetText, { color: theme.headerText }]}>
              TARGET: {target} | NEED: {runsNeeded} runs
            </Text>
          </View>
        )}
        <View style={styles.statsRow}>
          <Text style={[styles.statLabel, { color: theme.headerText }]}>CRR: <Text style={styles.statValue}>{overs !== '0.0' ? (runs / (parseInt(overs) + ((parseFloat(overs) % 1) / 0.6))).toFixed(2) : '--'}</Text></Text>
          {currentInnings === 2 && target ? (
            <>
              <Text style={[styles.statLabel, { color: theme.headerText }]}>Target: <Text style={styles.statValue}>{target}</Text></Text>
              <Text style={[styles.statLabel, { color: theme.headerText }]}>Need: <Text style={styles.statValue}>{runsNeeded}</Text></Text>
            </>
          ) : (
            <>
              <Text style={[styles.statLabel, { color: theme.headerText }]}>RRR: <Text style={styles.statValue}>{match.rrr || '--'}</Text></Text>
              <Text style={[styles.statLabel, { color: theme.headerText }]}>Target: <Text style={styles.statValue}>{match.target || '--'}</Text></Text>
            </>
          )}
        </View>
      </View>
    );
  };

  const BallTrail = () => {
    const teamBalls = getCurrentTeamBalls();
    const scrollRef = useRef(null);

    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollToEnd({ animated: true });
      }
    }, [teamBalls.length]);

    return (
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}
        style={styles.ballTrail}
      >
        {teamBalls.map((ball, idx) => (
        <View key={idx} style={[styles.ballIcon, getBallStyle(ball)]}>
          <Text style={styles.ballIconText}>{getBallLabel(ball)}</Text>
        </View>
      ))}
      </ScrollView>
  );
  };

  function getBallLabel(ball) {
    if (ball.wicket) return 'W';
    if (ball.runs === 4) return '4';
    if (ball.runs === 6) return '6';
    if (ball.extras > 0) return 'wd';
    if (ball.runs === 0) return '•';
    return String(ball.runs);
  }
  function getBallStyle(ball) {
    if (ball.wicket) return { backgroundColor: '#E53935' };
    if (ball.runs === 4) return { backgroundColor: '#FFA726' };
    if (ball.runs === 6) return { backgroundColor: '#43A047' };
    if (ball.extras > 0) return { backgroundColor: '#29B6F6' };
    if (ball.runs === 0) return { backgroundColor: '#BDBDBD' };
    return { backgroundColor: '#fff', borderWidth: 1, borderColor: '#BDBDBD' };
  }

  // Add to form state: striker, nonStriker, bowler
  // Add player pickers to QuickInputPanel
  const PlayerPicker = ({ label, players, selected, onSelect }) => (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{label}</Text>
      {players.length === 0 ? (
        <Text style={{ color: '#888', marginBottom: 4 }}>No players found for this team</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          {players.map(p => {
            let isOut = dismissedPlayers.includes(p.id);
            let isOverLimit = false;
            if (label === 'Bowler') {
              isOverLimit = getBowlerOvers(p.id) >= BOWLER_OVER_LIMIT;
            }
            const disabled = isOut || isOverLimit;
            return (
            <TouchableOpacity
              key={p.id}
                style={[
                  styles.playerBtn,
                  selected === p.id && styles.selectedBtn,
                  disabled && { backgroundColor: '#eee', borderColor: '#bbb' }
                ]}
                onPress={() => {
                  if (disabled) {
                    Alert.alert('Not allowed', isOverLimit ? `${p.name} has reached the ${BOWLER_OVER_LIMIT}-over limit.` : 'Player is out.');
                  } else {
                    onSelect(p.id);
                  }
                }}
                disabled={disabled}
              >
                <Text style={disabled ? { color: '#bbb', textDecorationLine: 'line-through' } : {}}>
                  {p.name}{isOut ? ' (OUT)' : ''}{isOverLimit ? ` (${BOWLER_OVER_LIMIT} overs)` : ''}
                </Text>
            </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  // Move this helper function above PlayerPicker:
  function getBowlerOvers(bowlerId) {
    // Count number of balls bowled by this bowler in current innings, divide by 6 for overs
    const ballsThisInnings = balls.filter(b => b.bowler_id === bowlerId && (b.innings === undefined || b.innings === currentInnings));
    let legalBalls = ballsThisInnings.filter(b => Number(b.extras) === 0).length;
    return Math.floor(legalBalls / 6) + (legalBalls % 6 > 0 ? 1 : 0); // count partial over as 1
  }

  const QuickInputPanel = () => {
    // Helper to submit a ball with a partial form update
    const quickSubmit = (partial) => {
      // Always use the merged form for validation and submission
      const updatedForm = { ...form, ...partial };
      // Validation: allow submission if wicket is true, even if runs/extras are empty
      if (!updatedForm.striker || !updatedForm.nonStriker || !updatedForm.bowler || (!updatedForm.wicket && updatedForm.runs === '' && updatedForm.extras === '')) {
        Alert.alert('Error', 'Please select striker, non-striker, bowler, and either runs, extras, or wicket.');
        setForm(f => ({ ...f, ...partial })); // Still update UI for feedback
        return;
      }
      // Set the form state for UI, but always submit the merged form
      setForm(f => ({ ...f, ...partial }));
      setTimeout(() => handleSubmitBall(updatedForm), 0);
    };

    const theme = currentInnings === 2 ? THEME_2 : THEME_1;

    return (
    <View style={[styles.inputPanel, { backgroundColor: theme.bg }]}>
      {/* Always show player pickers at the top */}
      <PlayerPicker label="Striker" players={battingPlayers} selected={form.striker} onSelect={id => setForm(f => ({ ...f, striker: id }))} />
      <PlayerPicker label="Non-Striker" players={battingPlayers} selected={form.nonStriker} onSelect={id => setForm(f => ({ ...f, nonStriker: id }))} />
      <PlayerPicker label="Bowler" players={bowlingPlayers} selected={form.bowler} onSelect={id => setForm(f => ({ ...f, bowler: id }))} />
        {/* Show the out player's name */}
        <Text style={{ marginBottom: 8, color: '#e53935', fontWeight: 'bold' }}>
          Out: {outBatsmanSelection === 'striker'
            ? (battingPlayers.find(p => p.id === form.striker)?.name || 'Striker')
            : (battingPlayers.find(p => p.id === form.nonStriker)?.name || 'Non-Striker')}
        </Text>
      <View style={styles.inputRow}>
        {[0,1,2,3,4,6].map(n => (
            <TouchableOpacity key={n} style={[styles.inputBtn, { backgroundColor: theme.btn }]} onPress={() => quickSubmit({ runs: String(n), extras: '', wicket: false })}><Text style={[styles.inputBtnText, { color: theme.btnText }]}>{n}</Text></TouchableOpacity>
        ))}
      </View>
      <View style={styles.inputRow}>
          <TouchableOpacity
            style={[styles.inputBtn, { backgroundColor: '#E53935' }]}
            onPress={() => setShowWhoIsOutModal(true)}
          >
            <Text style={styles.inputBtnText}>WICKET</Text>
      </TouchableOpacity>
          <TouchableOpacity style={[styles.inputBtn, { backgroundColor: theme.btn }]} onPress={() => quickSubmit({ extras: '1', runs: '', wicket: false })}><Text style={[styles.inputBtnText, { color: theme.btnText }]}>WD</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.inputBtn, { backgroundColor: theme.btn }]} onPress={() => quickSubmit({ extras: '1', runs: '', wicket: false })}><Text style={[styles.inputBtnText, { color: theme.btnText }]}>NB</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.inputBtn, { backgroundColor: theme.btn }]} onPress={handleUndo}><Text style={[styles.inputBtnText, { color: theme.btnText }]}>UNDO</Text></TouchableOpacity>
      </View>

      {/* WhoIsOutModal */}
      {showWhoIsOutModal && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '80%', maxWidth: 300 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16, textAlign: 'center' }}>Who is out?</Text>
            <TouchableOpacity 
              style={{ 
                backgroundColor: '#E53935', 
                padding: 12, 
                borderRadius: 8, 
                marginBottom: 8,
                alignItems: 'center'
              }} 
              onPress={() => {
                setShowWhoIsOutModal(false);
                quickSubmit({ wicket: true, runs: '', extras: '', outBatsman: form.striker });
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                {battingPlayers.find(p => p.id === form.striker)?.name || 'Striker'} (Striker)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ 
                backgroundColor: '#E53935', 
                padding: 12, 
                borderRadius: 8, 
                marginBottom: 8,
                alignItems: 'center'
              }} 
              onPress={() => {
                setShowWhoIsOutModal(false);
                quickSubmit({ wicket: true, runs: '', extras: '', outBatsman: form.nonStriker });
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                {battingPlayers.find(p => p.id === form.nonStriker)?.name || 'Non-Striker'} (Non-Striker)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ 
                backgroundColor: '#ccc', 
                padding: 12, 
                borderRadius: 8,
                alignItems: 'center'
              }} 
              onPress={() => setShowWhoIsOutModal(false)}
            >
              <Text style={{ color: '#666', fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
  };

  // Ball submit logic
  async function handleSubmitBall(overrideForm) {
    const submitForm = overrideForm || form;
    // Allow submission if wicket is true, even if runs and extras are empty
    if (!submitForm.striker || !submitForm.nonStriker || !submitForm.bowler || (!submitForm.wicket && submitForm.runs === '' && submitForm.extras === '')) {
      Alert.alert('Error', 'Please select striker, non-striker, bowler, and either runs, extras, or wicket.');
      return;
    }
    if (requireBowlerChange) {
      console.log('requireBowlerChange is true - showing bowler change modal');
      Alert.alert('Change Bowler', 'Please select a new bowler for the next over.');
      setBowlerChangeModal(true);
      return;
    }
    
    // Check if overs are complete before submitting ball
    if (isOversComplete()) {
      // Automatically switch innings instead of showing alert
      if (currentInnings === 1) {
        console.log('Overs complete - switching to second innings');
        setShowInningsModal(true);
        setTimeout(() => {
          setShowInningsModal(false);
          setCurrentInnings(2);
          setCurrentBattingTeamId(bowlingTeam?.id);
          setForm({ striker: '', nonStriker: '', bowler: '', runs: '', extras: '', wicket: false, wicketType: '', fielder: '' });
        }, 2000);
        return;
      } else {
        // Second innings overs complete - match ends
        console.log('Second innings overs complete - match ends');
        let result = '';
        const team1Runs = players.filter(p => p.team_id === teamA?.id).reduce((sum, p) => sum + getBatsmanStats(p.id).runs, 0);
        const team2Runs = players.filter(p => p.team_id === teamB?.id).reduce((sum, p) => sum + getBatsmanStats(p.id).runs, 0);
        if (team2Runs > team1Runs) {
          result = `${teamB?.name} won by ${10 - getBattingStats().wickets} wickets!`;
        } else if (team2Runs < team1Runs) {
          result = `${teamA?.name} won by ${team1Runs - team2Runs} runs!`;
        } else {
          result = 'Match tied!';
        }
        setResultMessage(result);
        setShowResultModal(true);
        return;
      }
    }
    
    setSubmitting(true);
    try {
      // Calculate over/ball, only increment for legal deliveries (extras == 0)
      let over = 1, ball = 1;
      // Only count balls from current innings for over calculation
      const currentInningsBalls = balls.filter(b => 
        (b.innings === undefined || b.innings === currentInnings) &&
        String(b.batting_team_id) === String(currentBattingTeamId)
      );
      const legalBalls = currentInningsBalls.filter(b => Number(b.extras) === 0);
      if (legalBalls.length > 0) {
        const lastLegal = legalBalls[legalBalls.length - 1];
        over = lastLegal.ball === 6 ? lastLegal.over + 1 : lastLegal.over;
        ball = lastLegal.ball === 6 ? 1 : lastLegal.ball + 1;
      }
      // For wides/no-balls, do not increment ball number
      if (Number(submitForm.extras) > 0 && currentInningsBalls.length > 0) {
        const lastBall = currentInningsBalls[currentInningsBalls.length - 1];
        over = lastBall.over;
        ball = lastBall.ball;
      }
      console.log('Ball calculation debug - calculated over:', over, 'ball:', ball, 'submitForm.extras:', submitForm.extras);
      const newBall = {
        match_id: matchId || null,
        over,
        ball,
        batsman_id: submitForm.outBatsman || submitForm.striker || null,
        non_striker_id: submitForm.nonStriker || null,
        bowler_id: submitForm.bowler || null,
        runs: Number(submitForm.runs) || 0,
        extras: Number(submitForm.extras) || 0,
        wicket: !!submitForm.wicket, // Always boolean
        wicket_type: submitForm.wicketType || null,
        fielder_id: submitForm.fielder || null,
        batting_team_id: currentBattingTeamId,
        innings: currentInnings,
      };
      const { error, data } = await supabase.from('ball_by_ball').insert(newBall);
      console.log('Insert ball result:', { error, data });
      if (error) {
        Alert.alert('Insert Error', error.message);
        return;
      }
      
      // Generate a temporary ID if data is null but no error (insertion was successful)
      const ballId = data?.[0]?.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Optimistically update balls state
      setBalls(prevBalls => [...prevBalls, { ...newBall, id: ballId }]);
      
      // If we don't have the proper database ID, just continue with optimistic update
      // The ball was inserted successfully, so we can rely on the optimistic update
      // If wicket, prompt for new batsman
      if (submitForm.wicket) {
        setShowNewBatsmanModal(true);
        setPendingNewBatsman({
          outBatsman: submitForm.striker,
          nonStriker: submitForm.nonStriker,
          bowler: submitForm.bowler
        });
        setForm(f => ({ ...f, runs: '', extras: '', wicket: false, wicketType: '', fielder: '' }));
        // No fetchMatch here; UI will update from local state
        return;
      }
      // Swap striker/non-striker if runs are odd
      const runsNum = Number(submitForm.runs);
      let newStriker = submitForm.striker;
      let newNonStriker = submitForm.nonStriker;
      if (runsNum % 2 === 1) {
        newStriker = submitForm.nonStriker;
        newNonStriker = submitForm.striker;
      }
      // Check for end of over (6 legal balls in current over)
      const thisOver = over;
      const ballsThisOver = currentInningsBalls.filter(b => b.over === thisOver && (!b.extras || b.extras === 0));
      // Only count existing balls, don't include current ball being submitted
      console.log('Ball counting debug - thisOver:', thisOver, 'ballsThisOver.length:', ballsThisOver.length, 'ball being submitted:', ball, 'total balls:', currentInningsBalls.length);
      if (ballsThisOver.length === 5 && Number(submitForm.extras) === 0) {
        console.log('End of over detected - showing bowler change modal');
        setForm({ striker: newNonStriker, nonStriker: newStriker, bowler: '', runs: '', extras: '', wicket: false, wicketType: '', fielder: '' });
        setRequireBowlerChange(true);
        setLastOver(thisOver);
        setBowlerChangeModal(true);
        Alert.alert('End Over', 'End of over. Striker and non-striker swapped. Please select a new bowler.');
      } else {
        setForm({ striker: newStriker, nonStriker: newNonStriker, bowler: submitForm.bowler, runs: '', extras: '', wicket: false, wicketType: '', fielder: '' });
      }
      
      // --- Automatic Innings Change and Match End ---
      if (!showResultModal && !showInningsModal) {
        console.log('Innings/Match end check - currentInnings:', currentInnings, 'isAllOut():', isAllOut(), 'isOversComplete():', isOversComplete());
        
        // FIRST INNINGS END CONDITIONS
        if (currentInnings === 1) {
          const firstInningsEnded = isAllOut() || isOversComplete();
          
          if (firstInningsEnded) {
            console.log('First innings complete - switching to second innings');
            setShowInningsModal(true);
            setTimeout(() => {
              setShowInningsModal(false);
              setCurrentInnings(2);
              setCurrentBattingTeamId(bowlingTeam?.id);
              setForm({ striker: '', nonStriker: '', bowler: '', runs: '', extras: '', wicket: false, wicketType: '', fielder: '' });
            }, 2000);
            return;
          }
        }
        
        // PROTECTION: Never allow going back to inning 1 once we're in inning 2
        if (currentInnings === 2) {
          console.log('Currently in second innings - preserving state');
        }
        
        // SECOND INNINGS END CONDITIONS
        if (currentInnings === 2) {
          // Calculate first innings total (target)
          const firstInningsBalls = balls.filter(b => b.innings === 1);
          const firstInningsRuns = firstInningsBalls.reduce((sum, b) => sum + (Number(b.runs) || 0) + (Number(b.extras) || 0), 0);
          
          // Calculate second innings current total
          const secondInningsBalls = balls.filter(b => b.innings === 2);
          const secondInningsRuns = secondInningsBalls.reduce((sum, b) => sum + (Number(b.runs) || 0) + (Number(b.extras) || 0), 0);
          
          console.log('Second innings check - firstInningsRuns:', firstInningsRuns, 'secondInningsRuns:', secondInningsRuns);
          
          // Check all second innings end conditions
          const targetReached = firstInningsRuns > 0 && secondInningsRuns > firstInningsRuns;
          const secondInningsEnded = isAllOut() || isOversComplete();
          
          if (targetReached || secondInningsEnded) {
            console.log('Second innings complete - match ends');
            
            // --- MATCH END LOGIC ---
            let result = '';
            
            if (targetReached) {
              // Target chased - batting team wins
              const wicketsLost = getBattingStats().wickets;
              result = `${battingTeam?.name} won by ${10 - wicketsLost} wickets!`;
            } else if (secondInningsRuns > firstInningsRuns) {
              // Second innings score exceeds target
              result = `${battingTeam?.name} won by ${secondInningsRuns - firstInningsRuns} runs!`;
            } else if (secondInningsRuns < firstInningsRuns) {
              // Second innings score below target
              result = `${bowlingTeam?.name} won by ${firstInningsRuns - secondInningsRuns} runs!`;
            } else {
              // Scores are equal
              result = 'Match tied!';
            }
            
            setResultMessage(result);
            setShowResultModal(true);
            
            // Update match status to completed and save winner
            try {
              const winnerTeam = targetReached || secondInningsRuns > firstInningsRuns ? battingTeam : bowlingTeam;
              const matchUpdate = {
                status: 'completed',
                winner_id: winnerTeam?.id,
                result: result
              };
              
              // Update match in database
              if (isTournamentMatch) {
                await supabase.from('tournament_matches').update(matchUpdate).eq('id', matchId);
              } else {
                await supabase.from('matches').update(matchUpdate).eq('id', matchId);
              }
              
              console.log('Match completed - status updated:', matchUpdate);
            } catch (error) {
              console.error('Failed to update match status:', error);
            }
            
            return;
          }
        }
      }
      // No fetchMatch here; UI will update from local state
    } catch (e) {
      Alert.alert('Error', 'Failed to submit ball');
      console.error('Exception in handleSubmitBall:', e);
    } finally {
      setSubmitting(false);
    }
  }

  // Undo logic
  async function handleUndo() {
    if (!balls.length) return;
    const lastBall = balls[balls.length - 1];
    try {
      await supabase.from('ball_by_ball').delete().eq('id', lastBall.id);
      fetchMatch();
    } catch (e) {
      Alert.alert('Error', 'Failed to undo last ball');
    }
  }

  // End over/change player logic
  function handleEndOver() {
    // Always swap striker/non-striker at end of over
    setForm(f => ({ ...f, striker: f.nonStriker, nonStriker: f.striker }));
    Alert.alert('End Over', 'End of over. Striker and non-striker swapped. Please change bowler if needed.');
  }
  function handleChangePlayers() {
    Alert.alert('Change Players', 'Change striker/non-striker/bowler as needed.');
  }

  // Helper to get batsman stats
  function getBatsmanStats(playerId) {
    const batsmanBalls = balls.filter(b =>
      b.batsman_id === playerId &&
      b.batting_team_id === currentBattingTeamId &&
      (b.innings === undefined || b.innings === currentInnings)
    );
    let runs = 0, ballsFaced = 0;
    batsmanBalls.forEach(b => {
      runs += (Number(b.runs) || 0) + (Number(b.extras) || 0);
      ballsFaced += 1;
    });
    return { runs, ballsFaced };
  }
  // Helper to get bowler stats
  function getBowlerStats(playerId) {
    const bowlerBalls = balls.filter(b =>
      b.bowler_id === playerId &&
      (b.innings === undefined || b.innings === currentInnings)
    );
    let runsConceded = 0, ballsBowled = 0, wickets = 0;
    bowlerBalls.forEach(b => {
      runsConceded += (Number(b.runs) || 0) + (Number(b.extras) || 0);
      ballsBowled += 1;
      if (b.wicket) wickets += 1;
    });
    return { runsConceded, ballsBowled, wickets };
  }

  // Update PlayerHighlights to show stats
  const PlayerHighlights = () => {
    const strikerStats = getBatsmanStats(form.striker);
    const nonStrikerStats = getBatsmanStats(form.nonStriker);
    const bowlerStats = getBowlerStats(form.bowler);
    return (
      <View style={styles.playerHighlights}>
        <View style={styles.playerCard}>
          <Image source={{ uri: dummyAvatar }} style={styles.avatar} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.playerName}>{battingPlayers.find(p => p.id === form.striker)?.name || 'Striker'}</Text>
            <Text style={{ fontSize: 18, marginLeft: 4 }}>🏏</Text>
          </View>
          <Text style={{ color: '#888', fontSize: 13 }}>Runs: {strikerStats.runs} ({strikerStats.ballsFaced} balls)</Text>
        </View>
        <View style={styles.playerCard}>
          <Image source={{ uri: dummyAvatar }} style={styles.avatar} />
          <Text style={styles.playerName}>{battingPlayers.find(p => p.id === form.nonStriker)?.name || 'Non-Striker'}</Text>
          <Text style={{ color: '#888', fontSize: 13 }}>Runs: {nonStrikerStats.runs} ({nonStrikerStats.ballsFaced} balls)</Text>
        </View>
        <View style={styles.playerCard}>
          <Image source={{ uri: dummyAvatar }} style={styles.avatar} />
          <Text style={styles.playerName}>{bowlingPlayers.find(p => p.id === form.bowler)?.name || 'Bowler'}</Text>
          <Text style={{ color: '#888', fontSize: 13 }}>Balls: {bowlerStats.ballsBowled}  Runs: {bowlerStats.runsConceded}</Text>
          <Text style={{ color: '#888', fontSize: 13 }}>Wickets: {bowlerStats.wickets}</Text>
        </View>
      </View>
    );
  };

  const EventBadge = () => eventBadge ? (
    <View style={styles.eventBadge}><Text style={styles.eventBadgeText}>{eventBadge}</Text></View>
  ) : null;

  // --- Input Panel for Organizers ---
  // Add styles for playerBtn and selectedBtn if not present
  const styles = StyleSheet.create({
    bg: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerCard: { backgroundColor: 'linear-gradient(90deg, #e53935 0%, #e35d5b 100%)', borderRadius: 24, padding: 20, margin: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
    tossText: { color: '#111', fontWeight: 'bold', marginBottom: 8, fontSize: 16, textAlign: 'center' },
    scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    teamCol: { flex: 1, alignItems: 'center' },
    teamName: { color: '#111', fontWeight: 'bold', fontSize: 16 },
    scoreBox: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16, alignItems: 'center', minWidth: 100 },
    scoreText: { color: '#111', fontWeight: 'bold', fontSize: 32 },
    oversText: { color: '#111', fontSize: 14 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
    statLabel: { color: '#111', fontSize: 14 },
    statValue: { fontWeight: 'bold', color: '#111' },
    ballTrail: { marginVertical: 16 }, // REMOVED alignItems/justifyContent
    ballIcon: { width: 32, height: 32, borderRadius: 16, marginHorizontal: 3, alignItems: 'center', justifyContent: 'center', elevation: 2 },
    ballIconText: { color: '#111', fontWeight: 'bold', fontSize: 16 },
    playerHighlights: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 4 }, // was 12
    playerCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 4, elevation: 2, width: 80 }, // radius 10, padding 4, width 80
    avatar: { width: 40, height: 40, borderRadius: 20, marginBottom: 2 }, // marginBottom 2
    playerName: { fontWeight: 'bold', fontSize: 14, color: '#111' },
    eventBadge: { backgroundColor: '#FFD700', alignSelf: 'center', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 6, marginVertical: 8, elevation: 3 },
    eventBadgeText: { color: '#111', fontWeight: 'bold', fontSize: 16 },
    tabRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
    tabBtn: { paddingVertical: 8, paddingHorizontal: 24, borderRadius: 20, backgroundColor: '#eee', marginHorizontal: 6 },
    activeTab: { backgroundColor: '#e53935' },
    tabBtnText: { fontWeight: 'bold', color: '#111' },
    inputPanel: { backgroundColor: '#fff', borderRadius: 20, padding: 16, margin: 16, elevation: 2 },
    inputRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 6 },
    inputBtn: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, minWidth: 60, alignItems: 'center', marginHorizontal: 4, elevation: 1 },
    inputBtnText: { fontWeight: 'bold', fontSize: 16, color: '#111' },
    actionBtn: { backgroundColor: '#e53935', borderRadius: 12, padding: 12, minWidth: 100, alignItems: 'center', marginHorizontal: 4 },
    actionBtnText: { color: '#111', fontWeight: 'bold', fontSize: 15 },
    chatPanel: { backgroundColor: '#fff', borderRadius: 20, padding: 16, margin: 16, elevation: 2 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8, color: '#e53935' },
    tossCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, margin: 24, elevation: 3, alignItems: 'center' },
    tossBtn: { backgroundColor: '#eee', borderRadius: 12, padding: 12, marginHorizontal: 8, minWidth: 80, alignItems: 'center' },
    selectedTossBtn: { backgroundColor: '#e53935' },
      tossBtnText: { fontWeight: 'bold', color: '#111', fontSize: 16 },
  playerBtn: { backgroundColor: '#eee', padding: 8, borderRadius: 8, marginRight: 8, minWidth: 60, alignItems: 'center' },
  selectedBtn: { backgroundColor: '#FFD700' },
  targetBanner: { padding: 12, borderRadius: 8, marginTop: 8, alignItems: 'center' },
  targetText: { fontWeight: 'bold', fontSize: 18, textAlign: 'center' },
});

  // After all useState/useEffect hooks, but before PlayerPicker and QuickInputPanel
  function getDismissedPlayers() {
    return balls
      .filter(b => b.wicket && b.batting_team_id === currentBattingTeamId && (b.innings === undefined || b.innings === currentInnings))
      .map(b => b.batsman_id)
      .filter(Boolean);
  }
  const dismissedPlayers = getDismissedPlayers();

  // Add after balls/players/currentInnings update:
  useEffect(() => {
    if (submitting || showNewBatsmanModal || showWhoIsOutModal) return;
    if (!balls.length || !players.length) return;
    // Find last ball for current innings
    const teamBalls = balls.filter(b => (b.innings === undefined || b.innings === currentInnings));
    if (!teamBalls.length) return;
    const lastBall = teamBalls[teamBalls.length - 1];
    // If last ball is first ball of a new over (ball === 1) and bowler is not set, clear bowler
    const isFirstBallNewOver = Number(lastBall.ball) === 1 && !lastBall.bowler_id;
    // If wicket, set striker to '' (handled by wicket flow), keep non-striker
    if (lastBall.wicket) {
      setForm(f => ({ ...f, striker: '', nonStriker: lastBall.non_striker_id, bowler: isFirstBallNewOver ? '' : lastBall.bowler_id }));
    } else {
      setForm(f => ({ ...f, striker: lastBall.batsman_id, nonStriker: lastBall.non_striker_id, bowler: isFirstBallNewOver ? '' : lastBall.bowler_id }));
    }
  }, [balls, players, currentInnings]);

  // BowlerChangeModal must be here:
  const BowlerChangeModal = () => {
    console.log('BowlerChangeModal render - bowlerChangeModal:', bowlerChangeModal, 'requireBowlerChange:', requireBowlerChange);
    return bowlerChangeModal ? (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '80%' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Select New Bowler</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {bowlingPlayers.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.playerBtn, form.bowler === p.id && styles.selectedBtn]}
                onPress={() => {
                  console.log('Bowler selected:', p.name);
                  setForm(f => ({ ...f, bowler: p.id }));
                  setRequireBowlerChange(false);
                  setBowlerChangeModal(false);
                }}
              >
                <Text>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.actionBtn} onPress={() => {
            if (!form.bowler) {
              Alert.alert('Select Bowler', 'Please select a bowler to continue.');
              return;
            }
            console.log('Confirming bowler:', form.bowler);
            setRequireBowlerChange(false);
            setBowlerChangeModal(false);
          }}>
            <Text style={styles.actionBtnText}>Confirm Bowler</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : null;
  };

  // Modal to select new batsman after wicket
  const NewBatsmanModal = () => (
    showNewBatsmanModal ? (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 20 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '80%' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
            {(() => {
              const outPlayer = battingPlayers.find(p => p.id === pendingNewBatsman?.outBatsman);
              return outPlayer ? `${outPlayer.name} is out. Please select the next batsman.` : 'Select New Batsman';
            })()}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {battingPlayers
              .filter(p => p.id !== pendingNewBatsman?.outBatsman && p.id !== pendingNewBatsman?.nonStriker && !dismissedPlayers.includes(p.id))
              .map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.playerBtn, form.striker === p.id && styles.selectedBtn]}
                onPress={() => {
                  setForm(f => ({ ...f, striker: p.id }));
                  setShowNewBatsmanModal(false);
                }}
              >
                <Text>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.actionBtn} onPress={() => {
            if (!form.striker) {
              Alert.alert('Select Batsman', 'Please select a batsman to continue.');
              return;
            }
            setShowNewBatsmanModal(false);
          }}>
            <Text style={styles.actionBtnText}>Confirm Batsman</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : null
  );

  // Update manual refresh button to use fetchMatchFull
  const RefreshButton = () => (
    <TouchableOpacity style={{ alignSelf: 'flex-end', margin: 8, padding: 8, backgroundColor: '#eee', borderRadius: 8 }} onPress={fetchMatchFull}>
      <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>Refresh</Text>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error) return <View style={styles.center}><Text>{error}</Text></View>;
  if (!match) return <View style={styles.center}><Text>Not found</Text></View>;

  if (!(isTournamentMatch
      ? (match.toss_decision || tossSubmitted)
      : (match.toss_winner || match.toss_choice || match.toss_result))) {
    // Show only toss card until toss is set
    if (!isOrganizer) {
      // Viewers see nothing until toss is set
      return <View style={styles.bg}><Text style={{ textAlign: 'center', marginTop: 32, color: '#888' }}>Toss not yet decided.</Text></View>;
    }
    // Only show TossDecisionCard for tournament matches
    if (isTournamentMatch) {
      return <View style={styles.bg}><ScrollView contentContainerStyle={{ paddingBottom: 32 }}><TossDecisionCard /></ScrollView></View>;
    }
  }

  if (!isOrganizer) {
    // Viewers: Only show scorecard and highlights, no input panels or chat
    return (
      <View style={styles.bg}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <HeaderCard />
          <BallTrail />
          <PlayerHighlights />
          {/* Optionally, add a more detailed scorecard here for viewers */}
        </ScrollView>
      </View>
    );
  }

  const theme = currentInnings === 2 ? THEME_2 : THEME_1;

  return (
    <View style={[styles.bg, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <RefreshButton />
        <HeaderCard />
        <EventBadge />
        <BallTrail />
        <PlayerHighlights />
          {isOrganizer ? (
          showResultModal ? <Text style={{ color: '#e53935', fontWeight: 'bold', fontSize: 20, textAlign: 'center', margin: 24 }}>{resultMessage}</Text>
            : <QuickInputPanel />
        ) : (
          <LiveChatPanel />
        )}
        {/* Removed Switch Innings button */}
        {/* Timeline, extras, fall of wickets, mini-scoreboard overlays, etc. can be added here */}
      </ScrollView>
      <BowlerChangeModal />
      <NewBatsmanModal />
      {showInningsModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 32, width: '80%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 22, color: '#1976D2', textAlign: 'center' }}>Innings Complete!</Text>
            <Text style={{ fontSize: 16, color: '#222', textAlign: 'center', marginTop: 12 }}>Switching to next innings...</Text>
          </View>
        </View>
      )}
      {showResultModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 32, width: '80%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 22, color: '#E53935', textAlign: 'center' }}>Match Over</Text>
            <Text style={{ fontSize: 18, color: '#222', textAlign: 'center', marginTop: 12 }}>{resultMessage}</Text>
            
            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 24 }}>
              <TouchableOpacity
                style={{ backgroundColor: '#1976D2', padding: 12, borderRadius: 8, minWidth: 100, alignItems: 'center' }}
                onPress={() => {
                  setShowResultModal(false);
                  navigation.goBack();
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Back to Matches</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{ backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, minWidth: 100, alignItems: 'center' }}
                onPress={() => {
                  setShowResultModal(false);
                  // TODO: Navigate to match summary screen
                  navigation.goBack();
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>View Summary</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { backgroundColor: 'linear-gradient(90deg, #e53935 0%, #e35d5b 100%)', borderRadius: 24, padding: 20, margin: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  tossText: { color: '#111', fontWeight: 'bold', marginBottom: 8, fontSize: 16, textAlign: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamCol: { flex: 1, alignItems: 'center' },
  teamName: { color: '#111', fontWeight: 'bold', fontSize: 16 },
  scoreBox: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16, alignItems: 'center', minWidth: 100 },
  scoreText: { color: '#111', fontWeight: 'bold', fontSize: 32 },
  oversText: { color: '#111', fontSize: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  statLabel: { color: '#111', fontSize: 14 },
  statValue: { fontWeight: 'bold', color: '#111' },
  ballTrail: { marginVertical: 16 }, // REMOVED alignItems/justifyContent
  ballIcon: { width: 32, height: 32, borderRadius: 16, marginHorizontal: 3, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  ballIconText: { color: '#111', fontWeight: 'bold', fontSize: 16 },
  playerHighlights: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 4 }, // was 12
  playerCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 4, elevation: 2, width: 80 }, // radius 10, padding 4, width 80
  avatar: { width: 40, height: 40, borderRadius: 20, marginBottom: 2 }, // marginBottom 2
  playerName: { fontWeight: 'bold', fontSize: 14, color: '#111' },
  eventBadge: { backgroundColor: '#FFD700', alignSelf: 'center', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 6, marginVertical: 8, elevation: 3 },
  eventBadgeText: { color: '#111', fontWeight: 'bold', fontSize: 16 },
  tabRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 24, borderRadius: 20, backgroundColor: '#eee', marginHorizontal: 6 },
  activeTab: { backgroundColor: '#e53935' },
  tabBtnText: { fontWeight: 'bold', color: '#111' },
  inputPanel: { backgroundColor: '#fff', borderRadius: 20, padding: 16, margin: 16, elevation: 2 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 6 },
  inputBtn: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, minWidth: 60, alignItems: 'center', marginHorizontal: 4, elevation: 1 },
  inputBtnText: { fontWeight: 'bold', fontSize: 16, color: '#111' },
  actionBtn: { backgroundColor: '#e53935', borderRadius: 12, padding: 12, minWidth: 100, alignItems: 'center', marginHorizontal: 4 },
  actionBtnText: { color: '#111', fontWeight: 'bold', fontSize: 15 },
  chatPanel: { backgroundColor: '#fff', borderRadius: 20, padding: 16, margin: 16, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8, color: '#e53935' },
  tossCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, margin: 24, elevation: 3, alignItems: 'center' },
  tossBtn: { backgroundColor: '#eee', borderRadius: 12, padding: 12, marginHorizontal: 8, minWidth: 80, alignItems: 'center' },
  selectedTossBtn: { backgroundColor: '#e53935' },
  tossBtnText: { fontWeight: 'bold', color: '#111', fontSize: 16 },
  playerBtn: { backgroundColor: '#eee', padding: 8, borderRadius: 8, marginRight: 8, minWidth: 60, alignItems: 'center' },
  selectedBtn: { backgroundColor: '#FFD700' },
  realTimeIndicator: { 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 8, 
    padding: 4, 
    marginBottom: 8, 
    alignItems: 'center' 
  },
  realTimeText: { 
    fontSize: 12, 
    fontWeight: 'bold' 
  },
}); 