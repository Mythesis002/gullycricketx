import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../utils/supabaseClient';

import { Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Match {
  id: string;
  team1_id: string;
  team2_id: string;
  team1_name?: string;
  team2_name?: string;
  match_title: string;
  match_type: string;
  overs: number;
  ball_type: string;
  scheduled_at: string;
  status: string;
  toss_winner?: string;
  toss_winner_team?: string;
  toss_choice?: string;
  toss_result?: string;
  toss_call?: string;
  toss_caller?: string;
  toss_time?: string;
  current_score?: string;
  current_overs?: string;
  batting_team?: string;
  created_at: string;
  team1_players?: (string | { id: string })[];
  team2_players?: (string | { id: string })[];
}

export default function MatchesScreen() {
  const navigation = useNavigation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'live' | 'completed' | 'requests'>('upcoming');
  const fadeAnim = new Animated.Value(0);
  // Fetch teams and requests for Requests tab
  const [matchRequests, setMatchRequests] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [senderInfoMap, setSenderInfoMap] = useState({}); // { [userId]: { username, avatar_url } }
  const [teamInfoMap, setTeamInfoMap] = useState({}); // { [teamId]: { name } }
  const [statRequests, setStatRequests] = useState([]);
  const subscriptionRef = useRef(null);
  const userIdRef = useRef(null); // Use a ref to hold userId for getFilteredMatches
  // Add debug state
  const [fetchError, setFetchError] = useState(null);
  const [rawMatches, setRawMatches] = useState([]);
  const [liveTournaments, setLiveTournaments] = useState([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [userId, setUserId] = useState(null);
  const [liveMatchStats, setLiveMatchStats] = useState({}); // { [matchId]: { team1: { runs, wickets, overs, logo }, team2: { runs, wickets, overs, logo } } }
  const [liveTournamentMatches, setLiveTournamentMatches] = useState([]);

  const [matchActivityTimers, setMatchActivityTimers] = useState({}); // { [matchId]: { lastUpdate: timestamp, timer: intervalId } }

  useEffect(() => {
    if (activeTab === 'live') fetchLiveData();
  }, [activeTab]);

      // Smart Status System: Monitor match activity and update statuses
    useEffect(() => {
      console.log('[DEBUG] useEffect triggered with matches:', matches.length, 'tournament matches:', liveTournamentMatches.length);
    
    // Initial status check for all matches (run once when matches are loaded)
    // DISABLED: This was causing new matches to be immediately suspended
    // Only the timer-based monitoring will check match activity now
    console.log('[DEBUG] Initial status check disabled to prevent immediate suspension of new matches');

    // Initial status check for all tournament matches (run once when tournament matches are loaded)
    // DISABLED: This was causing new tournament matches to be immediately suspended
    // Only the timer-based monitoring will check tournament match activity now
    console.log('[DEBUG] Initial tournament status check disabled to prevent immediate suspension of new tournament matches');

    // Start monitoring live and delayed matches for activity
    const activeMatches = matches.filter(m => {
      if (m.status === 'live' || m.status === 'delayed') {
        // Only monitor matches that are at least 10 minutes old (extended grace period)
        const matchCreatedTime = new Date(m.created_at).getTime();
        const now = new Date().getTime();
        const tenMinutes = 10 * 60 * 1000;
        const timeSinceCreation = now - matchCreatedTime;
        
        console.log(`[DEBUG] Filter check for match ${m.id}: timeSinceCreation=${Math.round(timeSinceCreation/1000)}s, will monitor: ${timeSinceCreation > tenMinutes}`);
        
        return timeSinceCreation > tenMinutes;
      }
      return false;
    });
    
    console.log(`[DEBUG] Active matches to monitor: ${activeMatches.length}`);
    
    // Set up new timers for active matches
    const newTimers = {};
    activeMatches.forEach(match => {
      const timer = setInterval(() => {
        console.log(`[DEBUG] Timer triggered for match ${match.id}`);
        checkMatchActivity(match.id);
      }, 60000); // Check every minute
      
      newTimers[match.id] = {
        lastUpdate: new Date().getTime(),
        timer: timer
      };
    });

    // Start monitoring scheduled and delayed tournament matches for activity
    console.log(`[DEBUG] Setting up tournament match monitoring for ${liveTournamentMatches.length} matches`);
    const activeTournamentMatches = liveTournamentMatches.filter(m => {
      console.log(`[DEBUG] Checking tournament match ${m.id}: status=${m.status}`);
      if (m.status === 'live' || m.status === 'delayed') {
        // Only monitor matches that are at least 10 minutes old (extended grace period)
        const matchCreatedTime = new Date(m.created_at).getTime();
        const now = new Date().getTime();
        const tenMinutes = 10 * 60 * 1000;
        const timeSinceCreation = now - matchCreatedTime;
        
        console.log(`[DEBUG] Tournament filter check for match ${m.id}: status=${m.status}, timeSinceCreation=${Math.round(timeSinceCreation/1000)}s, will monitor: ${timeSinceCreation > tenMinutes}`);
        
        return timeSinceCreation > tenMinutes;
      }
      console.log(`[DEBUG] Tournament match ${m.id} not eligible for monitoring (status: ${m.status})`);
      return false;
    });
    
    console.log(`[DEBUG] Active tournament matches to monitor: ${activeTournamentMatches.length}`);
    
    // Set up new timers for active tournament matches
    console.log(`[DEBUG] Setting up timers for ${activeTournamentMatches.length} active tournament matches`);
    activeTournamentMatches.forEach(match => {
      console.log(`[DEBUG] Setting up timer for tournament match ${match.id} (status: ${match.status})`);
      const timer = setInterval(() => {
        console.log(`[DEBUG] Tournament timer triggered for match ${match.id}`);
        checkTournamentMatchActivity(match.id);
      }, 60000); // Check every minute
      
      newTimers[`tournament_${match.id}`] = {
        lastUpdate: new Date().getTime(),
        timer: timer
      };
    });
    
    // Clear existing timers
    Object.values(matchActivityTimers).forEach(timerData => {
      if (timerData.timer) clearInterval(timerData.timer);
    });

    setMatchActivityTimers(newTimers);

    // Cleanup on unmount
    return () => {
      Object.values(newTimers).forEach(timerData => {
        if (timerData.timer) clearInterval(timerData.timer);
              });
      };
    }, [matches, liveTournamentMatches]);

  // Tournament match inactivity logic
  const checkTournamentMatchActivity = async (matchId) => {
    try {
      console.log(`[DEBUG] checkTournamentMatchActivity called for matchId: ${matchId}`);
      
      const match = liveTournamentMatches.find(m => m.id === matchId);
      if (!match) {
        console.log(`[DEBUG] Match ${matchId} not found in liveTournamentMatches`);
        return;
      }
      const now = new Date().getTime();
      const matchCreatedTime = new Date(match.created_at).getTime();
      
      // Get the latest ball-by-ball update for this match
      const { data: latestBall } = await supabase
        .from('ball_by_ball')
        .select('created_at')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(1);
      const lastBallTime = latestBall?.[0]?.created_at 
        ? new Date(latestBall[0].created_at).getTime() 
        : null;
      const fiveMinutes = 5 * 60 * 1000;
      const fiveHours = 5 * 60 * 60 * 1000;

      // Debug logging
      console.log(`[DEBUG] checkTournamentMatchActivity: matchId=${matchId}, status=${match.status}, hasBallByBall=${!!lastBallTime}`);

      // If match has no ball-by-ball records (never started scoring)
      if (!lastBallTime) {
        const timeSinceCreation = now - matchCreatedTime;
        console.log(`[DEBUG] Tournament - No ball-by-ball records: timeSinceCreation=${Math.round(timeSinceCreation/1000)}s`);

        // If match is very recent (within 5 minutes), keep as live
        if (timeSinceCreation <= fiveMinutes) {
          console.log(`[DEBUG] Tournament - Keeping match as LIVE (recently created): ${matchId}`);
          if (match.status !== 'live') {
            await updateTournamentMatchStatus(matchId, 'live');
          }
          return;
        }

        // If no updates for 5+ minutes, change to delayed
        if (timeSinceCreation > fiveMinutes && timeSinceCreation <= fiveHours) {
          console.log(`[DEBUG] Tournament - LIVE → DELAYED (no updates for >5 minutes): ${matchId}`);
          if (match.status !== 'delayed') {
          await updateTournamentMatchStatus(matchId, 'delayed');
          }
          return;
        }

        // If no updates for 5+ hours, change to suspended
        if (timeSinceCreation > fiveHours) {
          console.log(`[DEBUG] Tournament - DELAYED → SUSPENDED (no updates for >5 hours): ${matchId}`);
          if (match.status !== 'suspended') {
          await updateTournamentMatchStatus(matchId, 'suspended');
        }
          return;
        }
      }

      // Match has ball-by-ball records (scoring has started)
      const timeSinceLastBall = now - lastBallTime;
      console.log(`[DEBUG] Tournament - Has ball-by-ball records: lastBallTime=${new Date(lastBallTime).toISOString()}, timeSinceLastBall=${Math.round(timeSinceLastBall/1000)}s`);

      // If match is LIVE and no updates for 5+ minutes, change to DELAYED
      if (match.status === 'live' && timeSinceLastBall > fiveMinutes) {
        console.log(`[DEBUG] Tournament - LIVE → DELAYED (no updates for >5 minutes): ${matchId}`);
            await updateTournamentMatchStatus(matchId, 'delayed');
          }
      // If match is DELAYED and no updates for 5+ hours, change to SUSPENDED
      else if (match.status === 'delayed' && timeSinceLastBall > fiveHours) {
        console.log(`[DEBUG] Tournament - DELAYED → SUSPENDED (no updates for >5 hours): ${matchId}`);
            await updateTournamentMatchStatus(matchId, 'suspended');
          }
      // If match is DELAYED and updates resumed within 5 minutes, change back to LIVE
      else if (match.status === 'delayed' && timeSinceLastBall <= fiveMinutes) {
        console.log(`[DEBUG] Tournament - DELAYED → LIVE (updates resumed): ${matchId}`);
        await updateTournamentMatchStatus(matchId, 'live');
        }
      // If match is SUSPENDED and updates resumed within 5 minutes, change back to LIVE
      else if (match.status === 'suspended' && timeSinceLastBall <= fiveMinutes) {
        console.log(`[DEBUG] Tournament - SUSPENDED → LIVE (updates resumed): ${matchId}`);
        await updateTournamentMatchStatus(matchId, 'live');
      }
      else {
      console.log(`[DEBUG] Tournament - No status change needed for match ${matchId}: status=${match.status}`);
      }
    } catch (error) {
      console.error('Error checking tournament match activity:', error);
    }
  };

  // Function to check match activity and update status
  const checkMatchActivity = async (matchId) => {
    try {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      const now = new Date().getTime();
      const matchCreatedTime = new Date(match.created_at).getTime();
      
      // Get the latest ball-by-ball update for this match
      const { data: latestBall } = await supabase
        .from('ball_by_ball')
        .select('created_at')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(1);

      const lastBallTime = latestBall?.[0]?.created_at 
        ? new Date(latestBall[0].created_at).getTime() 
        : null;

      const fiveMinutes = 5 * 60 * 1000; // 5 minutes
      const fiveHours = 5 * 60 * 60 * 1000; // 5 hours

      // Debug logging
      console.log(`[DEBUG] checkMatchActivity: matchId=${matchId}, status=${match.status}, hasBallByBall=${!!lastBallTime}`);

      // If match has no ball-by-ball records (never started scoring)
      if (!lastBallTime) {
        const timeSinceCreation = now - matchCreatedTime;
        console.log(`[DEBUG] No ball-by-ball records: timeSinceCreation=${Math.round(timeSinceCreation/1000)}s`);

        // If match is very recent (within 5 minutes), keep as live
        if (timeSinceCreation <= fiveMinutes) {
          console.log(`[DEBUG] Keeping match as LIVE (recently created): ${matchId}`);
          if (match.status !== 'live') {
            await updateMatchStatus(matchId, 'live');
          }
          return;
        }
        
        // If no updates for 5+ minutes, change to delayed
        if (timeSinceCreation > fiveMinutes && timeSinceCreation <= fiveHours) {
          console.log(`[DEBUG] LIVE → DELAYED (no updates for >5 minutes): ${matchId}`);
          if (match.status !== 'delayed') {
            await updateMatchStatus(matchId, 'delayed');
          }
          return;
        }
        
        // If no updates for 5+ hours, change to suspended
        if (timeSinceCreation > fiveHours) {
          console.log(`[DEBUG] DELAYED → SUSPENDED (no updates for >5 hours): ${matchId}`);
          if (match.status !== 'suspended') {
            await updateMatchStatus(matchId, 'suspended');
          }
          return;
        }
      }

      // Match has ball-by-ball records (scoring has started)
      const timeSinceLastBall = now - lastBallTime;
      console.log(`[DEBUG] Has ball-by-ball records: lastBallTime=${new Date(lastBallTime).toISOString()}, timeSinceLastBall=${Math.round(timeSinceLastBall/1000)}s`);

      // If match is LIVE and no updates for 5+ minutes, change to DELAYED
      if (match.status === 'live' && timeSinceLastBall > fiveMinutes) {
        console.log(`[DEBUG] LIVE → DELAYED (no updates for >5 minutes): ${matchId}`);
        await updateMatchStatus(matchId, 'delayed');
      } 
      // If match is DELAYED and no updates for 5+ hours, change to SUSPENDED
      else if (match.status === 'delayed' && timeSinceLastBall > fiveHours) {
        console.log(`[DEBUG] DELAYED → SUSPENDED (no updates for >5 hours): ${matchId}`);
        await updateMatchStatus(matchId, 'suspended');
      } 
      // If match is DELAYED and updates resumed within 5 minutes, change back to LIVE
      else if (match.status === 'delayed' && timeSinceLastBall <= fiveMinutes) {
        console.log(`[DEBUG] DELAYED → LIVE (updates resumed): ${matchId}`);
        await updateMatchStatus(matchId, 'live');
      } 
      // If match is SUSPENDED and updates resumed within 5 minutes, change back to LIVE
      else if (match.status === 'suspended' && timeSinceLastBall <= fiveMinutes) {
        console.log(`[DEBUG] SUSPENDED → LIVE (updates resumed): ${matchId}`);
        await updateMatchStatus(matchId, 'live');
      }
      else {
        console.log(`[DEBUG] No status change needed for match ${matchId}: status=${match.status}, timeSinceLastBall=${Math.round(timeSinceLastBall/1000)}s`);
      }
    } catch (error) {
      console.error('Error checking match activity:', error);
    }
  };

  // Function to update match status
  const updateMatchStatus = async (matchId, newStatus) => {
    try {
      console.log(`Attempting to update match ${matchId} to status: ${newStatus}`);
      const { data, error } = await supabase
        .from('matches')
        .update({ status: newStatus })
        .eq('id', matchId)
        .select();
      if (error) {
        console.error('Error updating match status:', error);
        return;
      }
      if (!data || data.length === 0) {
        console.warn('No rows updated for match:', matchId);
      } else {
        console.log('Match status updated in DB:', data[0]);
      }
      // Update local state
      setMatches(prevMatches =>
        prevMatches.map(match =>
          match.id === matchId
            ? { ...match, status: newStatus }
            : match
        )
      );
    } catch (error) {
      console.error('Error updating match status:', error);
    }
  };

  // Function to update tournament match status
  const updateTournamentMatchStatus = async (matchId, newStatus) => {
    try {
      console.log(`Attempting to update tournament match ${matchId} to status: ${newStatus}`);
      const { data, error } = await supabase
        .from('tournament_matches')
        .update({ status: newStatus })
        .eq('id', matchId)
        .select();
      if (error) {
        console.error('Error updating tournament match status:', error);
        return;
      }
      if (!data || data.length === 0) {
        console.warn('No rows updated for tournament match:', matchId);
      } else {
        console.log('Tournament match status updated in DB:', data[0]);
      }
      // Update local state
      setLiveTournamentMatches(prevMatches =>
        prevMatches.map(match =>
          match.id === matchId
            ? { ...match, status: newStatus }
            : match
        )
      );
      // Refresh live data to ensure UI is updated
      fetchLiveData();
    } catch (error) {
      console.error('Error updating tournament match status:', error);
    }
  };

  // Function to manually fix all old matches (can be called from debug or admin)
  const fixAllOldMatches = async () => {
    console.log('Starting to fix all old matches...');
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000; // 1 day
    const fiveHours = 5 * 60 * 60 * 1000; // 5 hours

    for (const match of matches) {
      if (match.status === 'live') {
        const matchCreatedTime = new Date(match.created_at).getTime();
        const matchScheduledTime = match.scheduled_at ? new Date(match.scheduled_at).getTime() : null;
        
        // Get the latest ball-by-ball update for this match
        const { data: latestBall } = await supabase
          .from('ball_by_ball')
          .select('created_at')
          .eq('match_id', match.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastBallTime = latestBall?.[0]?.created_at 
          ? new Date(latestBall[0].created_at).getTime() 
          : null;
        
        // Check if match is old enough to be suspended
        const timeSinceCreation = now - matchCreatedTime;
        const timeSinceScheduled = matchScheduledTime ? now - matchScheduledTime : null;
        const timeSinceLastBall = lastBallTime ? now - lastBallTime : null;
        
        // If no ball-by-ball records and match is old, suspend it
        if (!lastBallTime && timeSinceCreation > oneDay) {
          console.log(`Fixing old match (no scoring): ${match.id} (created: ${new Date(match.created_at).toLocaleDateString()})`);
          await updateMatchStatus(match.id, 'suspended');
        }
        // If has ball-by-ball records but no updates for 5+ hours, suspend it
        else if (lastBallTime && timeSinceLastBall > fiveHours) {
          console.log(`Fixing old match (no recent scoring): ${match.id} (last ball: ${new Date(lastBallTime).toLocaleString()})`);
          await updateMatchStatus(match.id, 'suspended');
        }
        // If has ball-by-ball records but no updates for 5+ minutes, delay it
        else if (lastBallTime && timeSinceLastBall > 5 * 60 * 1000) {
          console.log(`Delaying match (no recent scoring): ${match.id} (last ball: ${new Date(lastBallTime).toLocaleString()})`);
          await updateMatchStatus(match.id, 'delayed');
        }
      }
    }
    console.log('Finished fixing old matches');
  };

  async function fetchLiveData() {
    setLoadingLive(true);
    // Get user ID
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    setUserId(uid);
    // Fetch live/in-progress tournaments (including 'scheduled')
    const { data: tournaments } = await supabase.from('tournaments').select('*').in('status', ['live', 'in_progress', 'active', 'published', 'scheduled']);
    console.log('DEBUG: Tournaments fetched:', tournaments?.map(t => ({ id: t.id, name: t.name, status: t.status })));
    setLiveTournaments(tournaments || []);
    // Fetch live and delayed matches from tournament_matches
    const { data: tournamentMatches } = await supabase.from('tournament_matches').select('*').in('status', ['in_progress', 'active', 'started', 'live', 'delayed']);
    console.log('DEBUG: Tournament matches fetched:', tournamentMatches?.map(m => ({ id: m.id, tournament_id: m.tournament_id, status: m.status, team_a_id: m.team_a_id, team_b_id: m.team_b_id })));
    setLiveTournamentMatches(tournamentMatches || []);
    // Fetch user's teams (unchanged)
    const { data: teamsData } = await supabase.from('teams').select('*');
    const myTeams = (teamsData || []).filter(team => {
      if (team.created_by === uid) return true;
      let playersArr = team.players;
      if (typeof playersArr === 'string') {
        try { playersArr = JSON.parse(playersArr); } catch { playersArr = []; }
      }
      if (Array.isArray(playersArr)) {
        return playersArr.some(p => p.id === uid);
      }
      return false;
    });
    const myTeamIds = myTeams.map(t => t.id);
    setLoadingLive(false);
  }

  // Simple utility to show 'time ago'
  function timeAgo(date) {
    if (!date) return '';
    // Debug: log the raw date
    console.log('timeAgo input:', date);
    const then = new Date(date);
    if (isNaN(then.getTime())) {
      console.log('Invalid date for timeAgo:', date);
      return '';
    }
    const now = new Date();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff/60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)} hr ago`;
    return `${Math.floor(diff/86400)} days ago`;
  }

  // Helper to get all user IDs from a team players array
  const getPlayerIds = (playersArr) => {
    if (!Array.isArray(playersArr)) return [];
    return playersArr.map(p => typeof p === 'object' ? p.id : p);
  };

  useEffect(() => {
    fetchMatches();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
    // Set up Supabase real-time subscription for match_requests
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    const sub = supabase
      .channel('public:match_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_requests' }, (payload) => {
        // On any insert/update/delete, refetch requests
        fetchRequests();
        fetchMatches(); // Also update live/completed tabs
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ball_by_ball' }, (payload) => {
        // DISABLED: This was causing immediate activity checks and suspension of new matches
        // Only the timer-based monitoring will check match activity now
        console.log('[DEBUG] Ball-by-ball change detected but activity check disabled to prevent immediate suspension');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (payload) => {
        // Listen for match status changes (like when match completes)
        console.log('[DEBUG] Match status change detected:', payload);
        if (payload.eventType === 'UPDATE' && payload.new?.status === 'completed') {
          console.log('[DEBUG] Match completed - refreshing matches data');
          fetchMatches(); // Refresh to show in highlights section
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_matches' }, (payload) => {
        // Listen for tournament match status changes
        console.log('[DEBUG] Tournament match status change detected:', payload);
        if (payload.eventType === 'UPDATE' && payload.new?.status === 'completed') {
          console.log('[DEBUG] Tournament match completed - refreshing matches data');
          fetchMatches(); // Refresh to show in highlights section
        }
      })
      .subscribe((status) => {
        console.log('[DEBUG] Subscription status:', status);
      });
    subscriptionRef.current = sub;
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchRequests();
    }, [activeTab])
  );

  const fetchRequests = async () => {
    setLoadingRequests(true);
    // Get user ID and teams where user is captain
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    setUserId(uid);
    userIdRef.current = uid; // Update ref for getFilteredMatches
    if (!uid) {
      setMatchRequests([]);
      setMyTeams([]);
      setLoadingRequests(false);
      return;
    }
    // Get teams where user is the creator
    const { data: teamsData } = await supabase.from('teams').select('*');
    const myTeams = (teamsData || []).filter(t => String(t.created_by) === String(uid));
    const myTeamIds = myTeams.map(t => String(t.id));
    console.log('MATCHES DEBUG: User ID:', uid);
    console.log('MATCHES DEBUG: My Teams:', myTeams);
    console.log('MATCHES DEBUG: My Team IDs:', myTeamIds);
    setMyTeams(myTeams);
    // Fetch requests where user is sender, receiver_user_id, or user's teams are involved
    const { data: requestsData } = await supabase.from('match_requests').select('*');
    const relevantRequests = (requestsData || []).filter(r => {
      // User is sender
      if (r.created_by === uid) return true;
      // User is receiver (team creator)
      if (r.receiver_user_id === uid) return true;
      // User's teams are involved (sender or receiver team)
      if (myTeamIds.includes(String(r.sender_team_id)) || myTeamIds.includes(String(r.receiver_team_id))) {
        return true;
      }
      return false;
    });
    console.log('MATCHES DEBUG: All Requests:', requestsData);
    console.log('MATCHES DEBUG: Relevant Requests:', relevantRequests);
    console.log('MATCHES DEBUG: Requests where my teams are receiver:', (requestsData || []).filter(r => myTeamIds.includes(String(r.receiver_team_id))));
    console.log('MATCHES DEBUG: Requests where my teams are sender:', (requestsData || []).filter(r => myTeamIds.includes(String(r.sender_team_id))));
    relevantRequests.forEach(r => {
      console.log('MATCHES DEBUG: Request details:', {
        id: r.id,
        created_by: r.created_by,
        match_title: r.match_title,
        match_type: r.match_type,
        overs: r.overs,
        ball_type: r.ball_type,
        status: r.status,
        created_at: r.created_at,
        sender_team_id: r.sender_team_id,
        receiver_team_id: r.receiver_team_id
      });
    });
    setMatchRequests(relevantRequests.map(r => ({ ...r, type: 'match' })));
    // Fetch stat approval requests for matches where user is a captain
    // Get all matches where user is captain of team1 or team2
    const { data: matchesData } = await supabase.from('matches').select('*');
    const myCaptainMatches = (matchesData || []).filter(m =>
      myTeams.some(t => t.id === m.team1_id && t.captainId === uid) ||
      myTeams.some(t => t.id === m.team2_id && t.captainId === uid)
    );
    const myMatchIds = myCaptainMatches.map(m => m.id);
    // Fetch pending stat submissions for these matches
    let statReqs = [];
    if (myMatchIds.length > 0) {
      const { data: statData } = await supabase.from('match_performances').select('*').in('match_id', myMatchIds).eq('status', 'submitted');
      statReqs = (statData || []).map(s => ({ ...s, type: 'stat' }));
    }
    setStatRequests(statReqs);
    // Fetch sender info for each request
    const senderIds = [...new Set(relevantRequests.map(r => r.created_by).filter(Boolean))];
    console.log('MATCHES DEBUG: Sender IDs:', senderIds);
    if (senderIds.length > 0) {
      const { data: usersData } = await supabase.from('users').select('id, name, profilePicture').in('id', senderIds);
      console.log('MATCHES DEBUG: Users data:', usersData);
      const senderMap = {};
      (usersData || []).forEach(u => { senderMap[u.id] = u; });
      setSenderInfoMap(senderMap);
    } else {
      setSenderInfoMap({});
    }
    // Fetch team info for all involved teams
    const allTeamIds = [...new Set(relevantRequests.flatMap(r => [r.sender_team_id, r.receiver_team_id]).filter(Boolean))];
    if (allTeamIds.length > 0) {
      const { data: teamsList } = await supabase.from('teams').select('id, name, created_by');
      const teamMap = {};
      (teamsList || []).forEach(t => { teamMap[t.id] = t; });
      setTeamInfoMap(teamMap);
    } else {
      setTeamInfoMap({});
    }
    setLoadingRequests(false);
  };

  const fetchMatches = async () => {
    try {
      // Get current user ID
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        setMatches([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const userIdStr = String(userId);
      // 1. Fetch all matches from 'matches' table
      const { data: matchesData, error: matchesError } = await supabase.from('matches').select('*');
      if (matchesError) {
        setFetchError(matchesError.message);
        console.error('Supabase fetch error:', matchesError);
      }
      
      // 2. Fetch completed tournament matches
      const { data: tournamentMatchesData, error: tournamentMatchesError } = await supabase.from('tournament_matches').select('*').eq('status', 'completed');
      if (tournamentMatchesError) {
        console.error('Supabase fetch error (tournament matches):', tournamentMatchesError);
      }
      
      // 3. Combine both normal and tournament matches
      const allMatches = [
        ...(matchesData || []),
        ...(tournamentMatchesData || []).map(tm => ({
          ...tm,
          // Map tournament match fields to normal match fields for consistency
          team1_id: tm.team_a_id,
          team2_id: tm.team_b_id,
          team1_players: tm.team_a_players,
          team2_players: tm.team_b_players,
          creatorid: tm.organizer_id,
          created_by: tm.organizer_id,
          isTournamentMatch: true // Flag to identify tournament matches
        }))
      ];
      
      setRawMatches(allMatches);
      console.log('Raw matches from DB (normal + tournament):', allMatches);
              if (allMatches.length > 0) {
        // 2. Collect all unique team1_id and team2_id from those matches (including tournament matches)
        const allTeamIds = [...new Set(allMatches.flatMap(match => [match.team1_id, match.team2_id]).filter(Boolean))];
        // 3. Fetch only those teams and build teamInfoMap
        let teamInfoMap = {};
        if (allTeamIds.length > 0) {
          const { data: teamsData, error: teamsError } = await supabase.from('teams').select('id, name, created_by').in('id', allTeamIds);
          if (teamsError) {
            console.error('Supabase fetch error (teams):', teamsError);
          }
          (teamsData || []).forEach(t => { teamInfoMap[t.id] = t; });
        }
        // 4. Filter matches using robust logic
        const myMatches = allMatches.filter(match => {
          // a. You are the match creator
          if (String(match.creatorid) === userIdStr || String(match.created_by) === userIdStr) {
            console.log('Including match (creator):', match.id);
            return true;
          }
          // b. You are a player in team1_players or team2_players
          let team1Players = [];
          let team2Players = [];
          if (match.team1_players) {
            if (typeof match.team1_players === 'string') {
              try { team1Players = JSON.parse(match.team1_players); } catch { team1Players = []; }
            } else if (Array.isArray(match.team1_players)) {
              team1Players = match.team1_players;
            }
          }
          if (match.team2_players) {
            if (typeof match.team2_players === 'string') {
              try { team2Players = JSON.parse(match.team2_players); } catch { team2Players = []; }
            } else if (Array.isArray(match.team2_players)) {
              team2Players = match.team2_players;
            }
          }
          const isPlayer = team1Players.some(p => String(p.id) === userIdStr || String(p.user_id) === userIdStr) ||
                           team2Players.some(p => String(p.id) === userIdStr || String(p.user_id) === userIdStr);
          if (isPlayer) {
            console.log('Including match (player):', match.id);
            return true;
          }
          // c. You are the creator of team1 or team2
          const team1Creator = teamInfoMap[match.team1_id]?.created_by;
          const team2Creator = teamInfoMap[match.team2_id]?.created_by;
          if (String(team1Creator) === userIdStr || String(team2Creator) === userIdStr) {
            console.log('Including match (team creator):', match.id);
            return true;
          }
          console.log('Excluding match:', match.id, {
            creatorid: match.creatorid,
            created_by: match.created_by,
            team1Players,
            team2Players,
            team1_id: match.team1_id,
            team2_id: match.team2_id,
            team1Creator,
            team2Creator
          });
        return false;
      });
        console.log('Final myMatches to render:', myMatches);
        const sortedMatches = myMatches.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA;
        });
        setMatches(sortedMatches);
        setTeamInfoMap(teamInfoMap);
        
        // DISABLED: These setTimeout calls were causing immediate suspension of new matches
        // Only the timer-based monitoring will check match activity now
        console.log('[DEBUG] Automatic activity checks disabled to prevent immediate suspension of new matches');
      }
    } catch (error) {
      setFetchError(error.message);
      console.error('Error fetching matches:', error);
      Alert.alert('Error', 'Failed to load matches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const handleOpenChat = (matchId: string) => {
    navigation.navigate('Chat', { matchId });
  };

  const handleViewAnalytics = (matchId: string) => {
    navigation.navigate('Analytics', { matchId });
  };

  // Manual trigger for testing
  const manualCheckActivity = (matchId: string) => {
    console.log('[DEBUG] Manual activity check triggered for match:', matchId);
    checkMatchActivity(matchId);
  };

  const manualCheckTournamentActivity = (matchId: string) => {
    console.log('[DEBUG] Manual tournament activity check triggered for match:', matchId);
    checkTournamentMatchActivity(matchId);
  };

  const getFilteredMatches = () => {
    const now = new Date();
    const currentUserId = userIdRef.current || userId;
    // For live tab, show only matches where user is creator, team creator, or player
    if (activeTab === 'live') {
      return matches.filter(match => {
        // Include only live and delayed matches (exclude suspended)
        const isActiveMatch = ['live', 'delayed'].includes(match.status);
        if (!isActiveMatch) return false;
        
        // 1. Match is created by me
        if (String(match.creatorid) === String(currentUserId) || String(match.created_by) === String(currentUserId)) return true;
        // 2. I created one of the participating teams
        const team1Creator = teamInfoMap[match.team1_id]?.created_by;
        const team2Creator = teamInfoMap[match.team2_id]?.created_by;
        if (String(team1Creator) === String(currentUserId) || String(team2Creator) === String(currentUserId)) return true;
        // 3. I am a player in any of the two teams
        let team1Players = [];
        let team2Players = [];
        if (match.team1_players) {
          if (typeof match.team1_players === 'string') {
            try { team1Players = JSON.parse(match.team1_players); } catch { team1Players = []; }
          } else if (Array.isArray(match.team1_players)) {
            team1Players = match.team1_players;
          }
        }
        if (match.team2_players) {
          if (typeof match.team2_players === 'string') {
            try { team2Players = JSON.parse(match.team2_players); } catch { team2Players = []; }
          } else if (Array.isArray(match.team2_players)) {
            team2Players = match.team2_players;
          }
        }
        const isPlayer = team1Players.some(p => String(p.id) === String(currentUserId) || String(p.user_id) === String(currentUserId)) ||
                         team2Players.some(p => String(p.id) === String(currentUserId) || String(p.user_id) === String(currentUserId));
        if (isPlayer) return true;
        return false;
      });
    }
    // Original filtering for other tabs
    const filtered = matches.filter(match => {
      const matchDateTime = new Date(match.scheduled_at || match.created_at);
      const userInTeam1 = getPlayerIds(match.team1_players).includes(currentUserId);
      const userInTeam2 = getPlayerIds(match.team2_players).includes(currentUserId);
      // Check if user is the creator of either team
      const team1Info = teamInfoMap[match.team1_id];
      const team2Info = teamInfoMap[match.team2_id];
      const isTeam1Creator = team1Info && team1Info.created_by === currentUserId;
      const isTeam2Creator = team2Info && team2Info.created_by === currentUserId;
      switch (activeTab) {
        case 'upcoming':
          return match.status === 'scheduled' && matchDateTime > now && (userInTeam1 || userInTeam2 || isTeam1Creator || isTeam2Creator);
        case 'completed':
          return match.status === 'completed' && (userInTeam1 || userInTeam2 || isTeam1Creator || isTeam2Creator);
        default:
          return userInTeam1 || userInTeam2 || isTeam1Creator || isTeam2Creator;
      }
    });
    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#2196F3';
      case 'live': return '#4CAF50';
      case 'delayed': return '#FF9800';
      case 'suspended': return '#F44336';
      case 'in_progress': return '#FF9800';
      case 'completed': return '#9E9E9E';
      default: return '#666';
    }
  };

  const getStatusText = (match: Match) => {
    const matchDateTime = new Date(match.scheduled_at || match.created_at);
    const now = new Date();
    
    if (match.status === 'live' || match.status === 'in_progress') {
      return 'LIVE';
    } else if (match.status === 'delayed') {
      return 'DELAYED';
    } else if (match.status === 'suspended') {
      return 'SUSPENDED';
    } else if (match.status === 'completed') {
      return 'COMPLETED';
    } else if (matchDateTime < now) {
      return 'FINISHED';
    } else {
      return 'UPCOMING';
    }
  };

  const formatMatchTime = (date: string, time: string) => {
    const matchDate = new Date(`${date} ${time}`);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (matchDate.toDateString() === today.toDateString()) {
      return `Today, ${time}`;
    } else if (matchDate.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${time}`;
    } else {
      return `${matchDate.toLocaleDateString()}, ${time}`;
    }
  };

  // Update renderMatch to parse player lists and always render something
  const renderMatch = ({ item }: { item: any }) => {
    console.log('Rendering match item:', item);
    // Parse player lists if they are strings
    const team1Players = typeof item.team1_players === 'string' ? JSON.parse(item.team1_players) : item.team1_players;
    const team2Players = typeof item.team2_players === 'string' ? JSON.parse(item.team2_players) : item.team2_players;
    // Minimal render for debug
    return (
      <TouchableOpacity onPress={() => navigation.navigate('LiveMatchSummaryScreen', { matchId: item.id })}>
        <View style={{ padding: 20, backgroundColor: '#fff', margin: 10, borderRadius: 10, elevation: 2 }}>
          <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 18 }}>
            {item.match_title || 'Untitled Match'}
              </Text>
          <Text style={{ color: '#888', fontSize: 15 }}>Status: {item.status}</Text>
          <Text style={{ color: '#888', fontSize: 13 }}>Team 1 Players: {Array.isArray(team1Players) ? team1Players.length : 0}</Text>
          <Text style={{ color: '#888', fontSize: 13 }}>Team 2 Players: {Array.isArray(team2Players) ? team2Players.length : 0}</Text>
            </View>
            </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="sports-cricket" size={80} color="#FFD700" />
      <Text style={styles.emptyTitle}>
        No {activeTab} matches
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'upcoming' 
          ? 'Schedule your first match to get started'
          : `No ${activeTab} matches found`
        }
      </Text>
      {activeTab === 'upcoming' && (
        <TouchableOpacity
          style={styles.createFirstMatch}
          onPress={() => navigation.navigate('ScheduleMatchScreen')}
        >
          <Text style={styles.createFirstMatchText}>Schedule Match</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const filteredMatches = getFilteredMatches();

  // Fetch live stats and logos for all matches in filteredMatches
  const fetchLiveStatsAndLogos = useCallback(async (matches) => {
    if (!matches || matches.length === 0) return;
    // 1. Fetch all balls for all matches
    const matchIds = matches.map(m => m.id);
    const { data: allBalls } = await supabase.from('ball_by_ball').select('*').in('match_id', matchIds);
    // 2. Collect all unique team IDs
    const allTeamIds = [...new Set(matches.flatMap(m => [m.team1_id, m.team2_id]).filter(Boolean))];
    // 3. Fetch team logos
    let teamLogoMap = {};
    if (allTeamIds.length > 0) {
      const { data: teamsData } = await supabase.from('teams').select('id, logo_url');
      (teamsData || []).forEach(t => { teamLogoMap[t.id] = t.logo_url; });
    }
    // 4. Calculate stats for each match
    const stats = {};
    matches.forEach(m => {
      const balls = (allBalls || []).filter(b => b.match_id === m.id);
      // Team 1
      let t1Runs = 0, t1Wickets = 0, t1Balls = 0, t1Extras = 0;
      balls.filter(b => String(b.batting_team_id) === String(m.team1_id)).forEach(b => {
        t1Runs += (Number(b.runs) || 0);
        t1Extras += (Number(b.extras) || 0);
        if (b.wicket) t1Wickets += 1;
        if (Number(b.extras) === 0) t1Balls += 1;
      });
      // Team 2
      let t2Runs = 0, t2Wickets = 0, t2Balls = 0, t2Extras = 0;
      balls.filter(b => String(b.batting_team_id) === String(m.team2_id)).forEach(b => {
        t2Runs += (Number(b.runs) || 0);
        t2Extras += (Number(b.extras) || 0);
        if (b.wicket) t2Wickets += 1;
        if (Number(b.extras) === 0) t2Balls += 1;
      });
      stats[m.id] = {
        team1: {
          runs: t1Runs,
          extras: t1Extras,
          wickets: t1Wickets,
          overs: `${Math.floor(t1Balls / 6)}.${t1Balls % 6}`,
          logo: teamLogoMap[m.team1_id] || null
        },
        team2: {
          runs: t2Runs,
          extras: t2Extras,
          wickets: t2Wickets,
          overs: `${Math.floor(t2Balls / 6)}.${t2Balls % 6}`,
          logo: teamLogoMap[m.team2_id] || null
        }
      };
    });
    setLiveMatchStats(stats);
  }, []);

  // Fetch live stats/logos when filteredMatches changes (live tab)
  useEffect(() => {
    if (activeTab === 'live' && filteredMatches.length > 0) {
      fetchLiveStatsAndLogos(filteredMatches);
    }
  }, [activeTab, filteredMatches, fetchLiveStatsAndLogos]);

  const canRespondToRequest = (req) => {
    // Only the team creator (receiver_user_id) can accept/reject
    return req.receiver_user_id === userId;
  };

  const handleAcceptRequest = async (item) => {
    try {
      await supabase.from('match_requests').update({ status: 'approved' }).eq('id', item.id);
      navigation.navigate('CoinTossScreen', { matchRequestId: item.id });
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleRejectRequest = async (item) => {
    try {
      await supabase.from('match_requests').update({ status: 'rejected' }).eq('id', item.id);
      Alert.alert('Rejected', 'Match request rejected.');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="sports-cricket" size={60} color="#FFD700" />
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Add tab bar/segmented control at the top
  const tabOptions = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'live', label: 'Live' },
    { key: 'highlights', label: 'Highlights' },
    { key: 'requests', label: 'Requests' },
    // Add more tabs as needed
  ];

  // Render the tab bar and content
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Segmented Tab Bar */}
      <View style={styles.tabContainer}>
        {tabOptions.map(tab => (
        <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
        </TouchableOpacity>
        ))}
      </View>
      {/* Tab Content */}
      {activeTab === 'highlights' && (
  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
    {/* All Highlights - Recent to Old */}
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      marginBottom: 16, 
      paddingHorizontal: 4 
    }}>
      <View style={{ 
        backgroundColor: '#2E7D32', 
        borderRadius: 8, 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        marginRight: 12 
      }}>
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>🏆</Text>
      </View>
      <View>
        <Text style={{ 
          fontWeight: 'bold', 
          fontSize: 24, 
          color: '#2E7D32',
          letterSpacing: 0.5
        }}>
          Match Highlights
        </Text>
        <Text style={{ 
          color: '#666', 
          fontSize: 14, 
          marginTop: 2,
          fontStyle: 'italic'
        }}>
          Recent completed and suspended matches
        </Text>
      </View>
    </View>
    {matches.filter(m => m.status === 'completed' || m.status === 'suspended').length === 0 && (
      <View style={{ 
        alignItems: 'center', 
        marginTop: 20, 
        marginBottom: 20,
        paddingVertical: 20
      }}>
        <MaterialIcons name="emoji-events" size={48} color="#ccc" />
        <Text style={{ 
          color: '#888', 
          fontSize: 16, 
          marginTop: 8,
          fontWeight: '500'
        }}>
          No Match Highlights
        </Text>
        <Text style={{ 
          color: '#aaa', 
          fontSize: 14, 
          marginTop: 4,
          textAlign: 'center'
        }}>
          Completed and suspended matches will appear here
        </Text>
      </View>
    )}
    <View style={{ 
      backgroundColor: '#f8f9fa', 
      borderRadius: 8, 
      padding: 12, 
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: '#2E7D32'
    }}>
      <Text style={{ 
        color: '#333', 
        fontSize: 13, 
        fontWeight: '600',
        marginBottom: 4
      }}>
        📊 Match Statistics
      </Text>
      <Text style={{ 
        color: '#666', 
        fontSize: 12,
        lineHeight: 18
      }}>
        Total: {matches.length} • Completed: {matches.filter(m => m.status === 'completed').length} • Suspended: {matches.filter(m => m.status === 'suspended').length}
      </Text>
    </View>
    {matches
      .filter(m => m.status === 'completed' || m.status === 'suspended')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Recent to old
      .map(m => (
        <View key={m.id} style={{ 
          backgroundColor: m.status === 'completed' ? '#f8fff8' : '#fff8f8', 
          borderRadius: 16, 
          marginBottom: 18, 
          padding: 18, 
          borderWidth: 1, 
          borderColor: m.status === 'completed' ? '#C8E6C9' : '#FFCDD2', 
          elevation: 1 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ 
              backgroundColor: m.status === 'completed' ? '#4CAF50' : '#F44336', 
              borderRadius: 8, 
              paddingHorizontal: 10, 
              paddingVertical: 2, 
              marginRight: 10 
            }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                {m.status === 'completed' ? 'COMPLETED' : 'SUSPENDED'}
              </Text>
            </View>
            <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 15 }}>
              {m.isTournamentMatch ? 
                `${teamInfoMap[m.team1_id]?.name || 'Team A'} vs ${teamInfoMap[m.team2_id]?.name || 'Team B'} (Tournament)` :
                `${teamInfoMap[m.team1_id]?.name || 'Team A'} vs ${teamInfoMap[m.team2_id]?.name || 'Team B'}`
              }
            </Text>
          </View>
          <Text style={{ color: '#666', marginBottom: 4 }}>
            Date: {m.scheduled_at ? new Date(m.scheduled_at).toLocaleDateString() : ''}
          </Text>
          {m.status === 'completed' ? (
            <Text style={{ color: '#666', marginBottom: 4 }}>
              {m.winner_name ? `Winner: ${m.winner_name}` : m.result ? `Result: ${m.result}` : 'Winner: TBD'}
            </Text>
          ) : (
            <Text style={{ color: '#666', marginBottom: 4 }}>Reason: No updates from scorer for over 5 hours</Text>
          )}
          <TouchableOpacity 
            style={{ backgroundColor: '#FFD700', borderRadius: 8, paddingVertical: 8, marginTop: 8, alignItems: 'center' }} 
            onPress={() => {
              console.log('[DEBUG] Navigating to scorecard for match:', {
                id: m.id,
                status: m.status,
                isTournamentMatch: m.isTournamentMatch,
                team1_id: m.team1_id,
                team2_id: m.team2_id
              });
              navigation.navigate('Scorecard', { matchId: m.id });
            }}
          >
            <Text style={{ color: '#222', fontWeight: 'bold' }}>View Scorecard</Text>
          </TouchableOpacity>
        </View>
      ))}

        </ScrollView>
      )}
      {activeTab === 'live' && (
        <View style={{ flex: 1 }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginLeft: 16, 
            marginTop: 16, 
            marginBottom: 8 
          }}>
            <View style={{ 
              backgroundColor: '#FF6B35', 
              borderRadius: 8, 
              paddingHorizontal: 10, 
              paddingVertical: 4, 
              marginRight: 10 
            }}>
              <MaterialIcons name="emoji-events" size={18} color="#fff" />
            </View>
            <View>
              <Text style={{ 
                fontWeight: 'bold', 
                fontSize: 22, 
                color: '#333',
                letterSpacing: 0.3
              }}>
                Live Tournaments
              </Text>
              <Text style={{ 
                color: '#666', 
                fontSize: 13, 
                marginTop: 1,
                fontStyle: 'italic'
              }}>
                All active tournament matches
              </Text>
            </View>
          </View>
          {loadingLive ? <ActivityIndicator /> : (
            <ScrollView>
              {liveTournamentMatches.length === 0 && (
                <View style={{ 
                  alignItems: 'center', 
                  marginTop: 20, 
                  marginHorizontal: 16,
                  paddingVertical: 20
                }}>
                  <MaterialIcons name="emoji-events" size={48} color="#ccc" />
                  <Text style={{ 
                    color: '#888', 
                    fontSize: 16, 
                    marginTop: 8,
                    fontWeight: '500'
                  }}>
                    No Live Tournaments
                  </Text>
                  <Text style={{ 
                    color: '#aaa', 
                    fontSize: 14, 
                    marginTop: 4,
                    textAlign: 'center'
                  }}>
                    Check back later for active tournament matches
                  </Text>
                </View>
              )}
              {liveTournamentMatches
                .filter(tm => tm.status === 'live' || tm.status === 'delayed')
                .map((tm, idx) => {
                const stats = liveMatchStats[tm.id] || {};
                const t1 = stats.team1 || {};
                const t2 = stats.team2 || {};
                const t1Total = (typeof t1.runs === 'number' && typeof t1.extras === 'number') ? t1.runs + t1.extras : undefined;
                const t2Total = (typeof t2.runs === 'number' && typeof t2.extras === 'number') ? t2.runs + t2.extras : undefined;
                return (
                  <View key={tm.id} style={{ backgroundColor: '#fff', borderRadius: 18, margin: 12, padding: 18, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 6 }}>{teamInfoMap[tm.team_a_id]?.name || 'Team A'} vs {teamInfoMap[tm.team_b_id]?.name || 'Team B'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      {/* Team 1 */}
                      <View style={{ alignItems: 'center', flex: 1 }}>
                        {t1.logo ? (
                          <Image source={{ uri: t1.logo }} style={{ width: 38, height: 38, borderRadius: 19, marginBottom: 2 }} />
                        ) : (
                          <Image source={require('../assets/images/icon.png')} style={{ width: 38, height: 38, borderRadius: 19, marginBottom: 2 }} />
                        )}
                        <Text style={{ fontWeight: 'bold', fontSize: 15 }}>{teamInfoMap[tm.team_a_id]?.name || 'Team A'}</Text>
                      </View>
                      {/* Score */}
                      <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 28, color: '#222' }}>{typeof t1Total === 'number' && typeof t1.wickets === 'number' ? `${t1Total}-${t1.wickets}` : '--'}</Text>
                        <Text style={{ color: '#888', fontSize: 15 }}>{t1.overs || ''} Overs</Text>
                      </View>
                      {/* VS */}
                      <View style={{ alignItems: 'center', flex: 0.2 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#888' }}>—</Text>
                      </View>
                      {/* Team 2 */}
                      <View style={{ alignItems: 'center', flex: 1 }}>
                        {t2.logo ? (
                          <Image source={{ uri: t2.logo }} style={{ width: 38, height: 38, borderRadius: 19, marginBottom: 2 }} />
                        ) : (
                          <Image source={require('../assets/images/icon.png')} style={{ width: 38, height: 38, borderRadius: 19, marginBottom: 2 }} />
                        )}
                        <Text style={{ fontWeight: 'bold', fontSize: 15 }}>{teamInfoMap[tm.team_b_id]?.name || 'Team B'}</Text>
                      </View>
                    </View>
                                         {/* Status badge and sub-label */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                       <View style={{ 
                         backgroundColor: tm.status === 'delayed' ? '#FF9800' : tm.status === 'suspended' ? '#F44336' : '#4CAF50', 
                         borderRadius: 8, 
                         paddingHorizontal: 10, 
                         paddingVertical: 2, 
                         marginRight: 8 
                       }}>
                         <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                           {tm.status === 'delayed' ? '● DELAYED' : tm.status === 'suspended' ? '● SUSPENDED' : '● LIVE'}
                         </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name={idx === 0 ? 'location-on' : idx === 1 ? 'whatshot' : 'trending-up'} size={18} color={idx === 0 ? '#2196F3' : idx === 1 ? '#FF9800' : '#e53935'} style={{ marginRight: 4 }} />
                        <Text style={{ color: '#888', fontWeight: 'bold', fontSize: 14 }}>{idx === 0 ? 'Nearby' : idx === 1 ? 'Trending Match' : 'Popular Now'}</Text>
                      </View>
                    </View>
                    {/* Watch Live/Share button */}
                    <View style={{ flexDirection: 'row', marginTop: 2 }}>
                      <TouchableOpacity style={{ backgroundColor: '#FFD700', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8, marginRight: 12 }} onPress={() => navigation.navigate('TournamentDetail', { tournamentId: tm.tournament_id })}>
                        <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 16 }}>Watch Live</Text>
        </TouchableOpacity>
                      <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8, borderWidth: 1, borderColor: '#FFD700' }} onPress={() => {/* Share logic */}}>
                        <Text style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 16 }}>Share</Text>
        </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginLeft: 16, 
                marginTop: 24, 
                marginBottom: 12 
              }}>
                <View style={{ 
                  backgroundColor: '#4CAF50', 
                  borderRadius: 8, 
                  paddingHorizontal: 10, 
                  paddingVertical: 4, 
                  marginRight: 10 
                }}>
                  <MaterialIcons name="sports-cricket" size={18} color="#fff" />
                </View>
                <View>
                  <Text style={{ 
                    fontWeight: 'bold', 
                    fontSize: 22, 
                    color: '#333',
                    letterSpacing: 0.3
                  }}>
                    My Live Matches
                  </Text>
                  <Text style={{ 
                    color: '#666', 
                    fontSize: 13, 
                    marginTop: 1,
                    fontStyle: 'italic'
                  }}>
                    Your active match sessions
                  </Text>
                </View>
              </View>
              {filteredMatches.length === 0 && (
                <View style={{ 
                  alignItems: 'center', 
                  marginTop: 20, 
                  marginHorizontal: 16,
                  paddingVertical: 20
                }}>
                  <MaterialIcons name="sports-cricket" size={48} color="#ccc" />
                  <Text style={{ 
                    color: '#888', 
                    fontSize: 16, 
                    marginTop: 8,
                    fontWeight: '500'
                  }}>
                    No Live Matches
                  </Text>
                  <Text style={{ 
                    color: '#aaa', 
                    fontSize: 14, 
                    marginTop: 4,
                    textAlign: 'center'
                  }}>
                    Start a match or join an existing one
                  </Text>
                </View>
              )}
              {filteredMatches.map((m, idx) => {
                const stats = liveMatchStats[m.id] || {};
                const t1 = stats.team1 || {};
                const t2 = stats.team2 || {};
                const t1Total = (typeof t1.runs === 'number' && typeof t1.extras === 'number') ? t1.runs + t1.extras : undefined;
                const t2Total = (typeof t2.runs === 'number' && typeof t2.extras === 'number') ? t2.runs + t2.extras : undefined;
                const isTournament = liveTournamentMatches.some(tm => tm.id === m.id) || m.tournament_id;
                return (
                  <View
                    key={m.id}
                    style={isTournament ? {
                      backgroundColor: '#fffbe6',
                      borderRadius: 20,
                      margin: 12,
                      padding: 22,
                      borderWidth: 2,
                      borderColor: '#FFD700',
                      elevation: 5,
                      shadowColor: '#FFD700',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.18,
                      shadowRadius: 10,
                    } : {
                      backgroundColor: '#fff',
                      borderRadius: 16,
                      margin: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#E0E0E0',
                      elevation: 1,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                    }}
                  >
                    {/* Status badge and (if tournament) TOURNAMENT badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <View style={{ 
                        backgroundColor: m.status === 'delayed' ? '#FF9800' : m.status === 'suspended' ? '#F44336' : '#e53935', 
                        borderRadius: 8, 
                        paddingHorizontal: 12, 
                        paddingVertical: 3, 
                        marginRight: 10 
                      }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: isTournament ? 15 : 13 }}>
                          {m.status === 'delayed' ? '⚠️ DELAYED' : m.status === 'suspended' ? '⏸️ SUSPENDED' : '● LIVE'}
                        </Text>
                      </View>
                      {isTournament && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFD700', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, marginRight: 10 }}>
                          <MaterialIcons name="emoji-events" size={18} color="#b8860b" style={{ marginRight: 4 }} />
                          <Text style={{ color: '#b8860b', fontWeight: 'bold', fontSize: 14 }}>TOURNAMENT</Text>
                        </View>
                      )}
                      <Text style={{ color: '#888', fontWeight: isTournament ? 'bold' : '600', fontSize: isTournament ? 14 : 12 }}>
                        {m.status === 'delayed' ? 'Match delayed due to no activity' : 
                         m.status === 'suspended' ? 'Match suspended due to inactivity' :
                         isTournament ? 'Premium Tournament' : 'Ongoing Match'}
                      </Text>
                    </View>
                    {/* Teams and Score */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      {/* Team 1 */}
                      <View style={{ alignItems: 'center', flex: 1 }}>
                        {t1.logo ? (
                          <Image source={{ uri: t1.logo }} style={{ width: isTournament ? 44 : 36, height: isTournament ? 44 : 36, borderRadius: isTournament ? 22 : 18, marginBottom: 2 }} />
                        ) : (
                          <Image source={require('../assets/images/icon.png')} style={{ width: isTournament ? 44 : 36, height: isTournament ? 44 : 36, borderRadius: isTournament ? 22 : 18, marginBottom: 2 }} />
                        )}
                        <Text style={{ fontWeight: isTournament ? 'bold' : '600', fontSize: isTournament ? 16 : 13 }}>{teamInfoMap[m.team1_id]?.name || 'Team A'}</Text>
                      </View>
                      {/* Score */}
                      <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: isTournament ? 30 : 22, color: '#222' }}>{typeof t1Total === 'number' && typeof t1.wickets === 'number' ? `${t1Total}-${t1.wickets}` : '--'}</Text>
                        <Text style={{ color: '#888', fontSize: isTournament ? 16 : 13 }}>{t1.overs || ''} Overs</Text>
                      </View>
                      {/* VS */}
                      <View style={{ alignItems: 'center', flex: 0.2 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: isTournament ? 18 : 14, color: '#888' }}>—</Text>
                      </View>
                      {/* Team 2 */}
                      <View style={{ alignItems: 'center', flex: 1 }}>
                        {t2.logo ? (
                          <Image source={{ uri: t2.logo }} style={{ width: isTournament ? 44 : 36, height: isTournament ? 44 : 36, borderRadius: isTournament ? 22 : 18, marginBottom: 2 }} />
                        ) : (
                          <Image source={require('../assets/images/icon.png')} style={{ width: isTournament ? 44 : 36, height: isTournament ? 44 : 36, borderRadius: isTournament ? 22 : 18, marginBottom: 2 }} />
                        )}
                        <Text style={{ fontWeight: isTournament ? 'bold' : '600', fontSize: isTournament ? 16 : 13 }}>{teamInfoMap[m.team2_id]?.name || 'Team B'}</Text>
                      </View>
                    </View>
                    {/* Watch Live/Share button */}
                    <View style={{ flexDirection: 'row', marginTop: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <TouchableOpacity style={isTournament ? { backgroundColor: '#FFD700', borderRadius: 10, paddingHorizontal: 28, paddingVertical: 12, marginRight: 10, elevation: 3 } : { backgroundColor: '#FFD700', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8, marginRight: 8, elevation: 1 }} onPress={() => navigation.navigate('LiveScoring', { matchId: m.id })}>
                        <Text style={{ color: '#222', fontWeight: 'bold', fontSize: isTournament ? 18 : 15 }}>Watch Live</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={isTournament ? { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 2, borderColor: '#FFD700', elevation: 2 } : { backgroundColor: '#fff', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#FFD700', elevation: 1 }} onPress={() => {/* Share logic */}}>
                        <MaterialIcons name="share" size={isTournament ? 22 : 18} color="#FFD700" />
        </TouchableOpacity>
      </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
      {activeTab === 'upcoming' && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={filteredMatches}
            renderItem={renderMatch}
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
              filteredMatches.length === 0 ? styles.emptyContainer : styles.listContainer
            }
            showsVerticalScrollIndicator={false}
          />
      </View>
      )}
      {activeTab === 'requests' && (
        <View style={{ flex: 1 }}>
          {loadingRequests ? (
          <View style={styles.loadingContainer}>
            <MaterialIcons name="mail" size={60} color="#FFD700" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : (
          <FlatList
            data={[...statRequests, ...matchRequests]}
            keyExtractor={item => item.id + (item.type || '')}
            contentContainerStyle={statRequests.length + matchRequests.length === 0 ? styles.emptyContainer : styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialIcons name="mail" size={80} color="#FFD700" />
                <Text style={styles.emptyTitle}>No Requests</Text>
                <Text style={styles.emptySubtitle}>No match invites or stat approvals found</Text>
              </View>
            }
            renderItem={({ item }) => {
              if (item.type === 'stat') {
                // Render stat approval request
                return (
                  <View style={styles.requestCard}> 
                    <View style={styles.requestHeader}>
                      <View style={styles.requestTypeContainer}>
                        <MaterialIcons name="assessment" size={20} color="#FF6B35" />
                        <Text style={styles.requestTypeText}>Stat Approval</Text>
                      </View>
                      <Text style={styles.requestTime}>
                        {item.created_at ? timeAgo(item.created_at) : ''}
                      </Text>
                    </View>
                    
                    <View style={styles.requestContent}>
                      <View style={styles.detailRow}>
                        <MaterialIcons name="person" size={16} color="#666" />
                        <Text style={styles.detailText}>Player: {item.player_id}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <MaterialIcons name="sports-cricket" size={16} color="#666" />
                        <Text style={styles.detailText}>Match: {item.match_id}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <MaterialIcons name="group" size={16} color="#666" />
                        <Text style={styles.detailText}>Team: {item.team_id}</Text>
                      </View>
                      <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                          <MaterialIcons name="trending-up" size={16} color="#4CAF50" />
                          <Text style={styles.statText}>{item.runs} Runs</Text>
                        </View>
                        <View style={styles.statItem}>
                          <MaterialIcons name="sports-cricket" size={16} color="#FF9800" />
                          <Text style={styles.statText}>{item.wickets} Wickets</Text>
                        </View>
                        <View style={styles.statItem}>
                          <MaterialIcons name="pan-tool" size={16} color="#2196F3" />
                          <Text style={styles.statText}>{item.catches} Catches</Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.requestActions}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.approveBtn]} 
                        onPress={async () => {
                        await supabase.from('match_performances').update({ status: 'confirmed' }).eq('id', item.id);
                        fetchRequests();
                        }}
                      >
                        <MaterialIcons name="check" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.rejectBtn]} 
                        onPress={async () => {
                        await supabase.from('match_performances').update({ status: 'rejected' }).eq('id', item.id);
                        fetchRequests();
                        }}
                      >
                        <MaterialIcons name="close" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }
              
              const isReceiver = myTeams.some(t => String(t.id) === String(item.receiver_team_id));
              const isSender = myTeams.some(t => String(t.id) === String(item.sender_team_id));
              const sender = senderInfoMap[item.created_by];
              const senderTeam = teamInfoMap[item.sender_team_id];
              const receiverTeam = teamInfoMap[item.receiver_team_id];
              const canRespond = canRespondToRequest(item);
              
              return (
                <View style={styles.requestCard}> 
                  <View style={styles.requestHeader}>
                    <View style={styles.senderInfo}>
                      {sender?.profilePicture ? (
                        <Image source={{ uri: sender.profilePicture }} style={styles.senderAvatar} />
                      ) : (
                        <View style={styles.senderAvatarPlaceholder}>
                          <MaterialIcons name="person" size={20} color="#999" />
                        </View>
                      )}
                      <View style={styles.senderDetails}>
                        <Text style={styles.senderName}>
                          {sender ? sender.name : 'Unknown User'}
                    </Text>
                        <Text style={styles.senderLabel}>sent a match request</Text>
                      </View>
                    </View>
                    <Text style={styles.requestTime}>
                      {item.created_at ? timeAgo(item.created_at) : ''}
                    </Text>
                  </View>
                  
                  <View style={styles.requestContent}>
                    <View style={styles.teamsSection}>
                      <View style={styles.teamRow}>
                        <MaterialIcons name="group" size={16} color="#4CAF50" />
                        <Text style={styles.teamLabel}>From:</Text>
                        <Text style={styles.teamName}>{senderTeam ? senderTeam.name : 'Unknown Team'}</Text>
                  </View>
                      <View style={styles.vsDivider}>
                        <Text style={styles.vsText}>VS</Text>
                      </View>
                      <View style={styles.teamRow}>
                        <MaterialIcons name="group" size={16} color="#2196F3" />
                        <Text style={styles.teamLabel}>To:</Text>
                        <Text style={styles.teamName}>{receiverTeam ? receiverTeam.name : 'Your Team'}</Text>
                      </View>
                    </View>
                    
                                         <View style={styles.matchDetailsSection}>
                       <View style={styles.detailRow}>
                         <MaterialIcons name="sports-cricket" size={16} color="#666" />
                         <Text style={styles.detailText}>Type: {item.match_type || 'Friendly'}</Text>
                       </View>
                       <View style={styles.detailRow}>
                         <MaterialIcons name="timer" size={16} color="#666" />
                         <Text style={styles.detailText}>Overs: {item.overs || 'TBD'}</Text>
                       </View>
                       <View style={styles.detailRow}>
                         <MaterialIcons name="sports-soccer" size={16} color="#666" />
                         <Text style={styles.detailText}>Ball: {item.ball_type || 'Standard'}</Text>
                       </View>
                       {item.match_title && (
                         <View style={styles.detailRow}>
                           <MaterialIcons name="title" size={16} color="#666" />
                           <Text style={styles.detailText}>Title: {item.match_title}</Text>
                         </View>
                       )}
                       {item.scheduled_at && (
                         <View style={styles.detailRow}>
                           <MaterialIcons name="event" size={16} color="#666" />
                           <Text style={styles.detailText}>Scheduled: {new Date(item.scheduled_at).toLocaleDateString()}</Text>
                         </View>
                       )}
                     </View>
                    
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusBadge, { backgroundColor: item.status === 'pending' ? '#FF9800' : item.status === 'approved' ? '#4CAF50' : '#F44336' }]}>
                        <MaterialIcons 
                          name={item.status === 'pending' ? 'schedule' : item.status === 'approved' ? 'check-circle' : 'cancel'} 
                          size={14} 
                          color="#fff" 
                        />
                        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                  
                  {item.status === 'pending' && isReceiver && canRespond && (
                    <View style={styles.requestActions}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.viewBtn]} 
                        onPress={() => navigation.navigate('MatchRequestApprovalScreen', { matchRequestId: item.id })}
                      >
                        <MaterialIcons name="visibility" size={16} color="#2196F3" />
                        <Text style={[styles.actionBtnText, { color: '#2196F3' }]}>View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.approveBtn]} 
                        onPress={async () => await handleAcceptRequest(item)}
                      >
                        <MaterialIcons name="check" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.rejectBtn]} 
                        onPress={async () => await handleRejectRequest(item)}
                      >
                        <MaterialIcons name="close" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
          />
          )}
        </View>
      )}

      {fetchError && (
        <View style={{ padding: 16, backgroundColor: '#fff' }}>
          <Text style={{ color: 'red', fontWeight: 'bold' }}>Fetch error: {fetchError}</Text>
        </View>
      )}
      

      {rawMatches.length === 0 && !fetchError && (
        <View style={{ padding: 16, backgroundColor: '#fff' }}>
          <Text style={{ color: '#222', fontWeight: 'bold' }}>No matches fetched from database.</Text>
        </View>
      )}


    </View>
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
  createFirstMatch: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  createFirstMatchText: {
    color: '#1B5E20',
    fontWeight: 'bold',
    fontSize: 16,
  },
  matchCard: {
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
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 12,
    textAlign: 'center',
  },
  formatBadge: {
    backgroundColor: '#2E7D32',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  formatText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginLeft: 4,
  },
  teamsContainer: {
    marginBottom: 16,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 8,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  vsContainer: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  vsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  matchDetails: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  tossInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  tossText: {
    fontSize: 12,
    color: '#F57F17',
    marginLeft: 6,
    fontWeight: '500',
  },
  liveScore: {
    backgroundColor: '#E8F5E8',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  liveScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  actionsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
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
  // New Request Card Styles
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  requestTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  requestTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
    marginLeft: 6,
  },
  requestTime: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  senderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  senderAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  senderDetails: {
    flex: 1,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  senderLabel: {
    fontSize: 13,
    color: '#666',
  },
  requestContent: {
    marginBottom: 16,
  },
  teamsSection: {
    marginBottom: 16,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
    minWidth: 40,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  vsDivider: {
    alignItems: 'center',
    marginVertical: 8,
  },
  vsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchDetailsSection: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    marginTop: 4,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  viewBtn: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  approveBtn: {
    backgroundColor: '#4CAF50',
  },
  rejectBtn: {
    backgroundColor: '#F44336',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
});

// SuspendedLastScore component (no duplicate imports)
function SuspendedLastScore({ matchId }) {
  const [lastScore, setLastScore] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchLastBall() {
      const { data: balls } = await supabase
        .from('ball_by_ball')
        .select('batting_team, runs, wickets, over, ball')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (isMounted && balls && balls.length > 0) {
        const b = balls[0];
        setLastScore(`${b.batting_team || 'Team'}: ${b.runs || 0}/${b.wickets || 0} in ${b.over || 0}.${b.ball || 0} overs`);
      } else if (isMounted) {
        setLastScore('No score recorded');
      }
    }
    fetchLastBall();
    return () => { isMounted = false; };
  }, [matchId]);

  if (!lastScore) return null;
  return (
    <Text style={{ color: '#F44336', fontWeight: 'bold', marginBottom: 2 }}>Last known score: {lastScore}</Text>
  );
}
