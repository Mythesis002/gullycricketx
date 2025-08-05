import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert, Animated, Easing, Dimensions } from 'react-native';
import { supabase } from '../utils/supabaseClient';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

// Local assets (add your own images in assets/images/)
const COIN_HEADS = require('../assets/images/coin-heads.png');
const COIN_TAILS = require('../assets/images/coin-tails.png');
const STADIUM_BG = require('../assets/images/stadium-bg.jpg');

const { width } = Dimensions.get('window');

export default function CoinTossScreen({ route }) {
  const navigation = useNavigation();
  const { matchRequestId } = route.params;
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [teams, setTeams] = useState({ team1: null, team2: null });
  const [user, setUser] = useState(null);
  const [isOpponentCreator, setIsOpponentCreator] = useState(false);
  const [tossState, setTossState] = useState('ready'); // ready, flipping, result, decision, confirming
  const [flipResult, setFlipResult] = useState(null); // 'heads' or 'tails'
  const [winnerTeam, setWinnerTeam] = useState(null);
  const [tossChoice, setTossChoice] = useState(null); // 'bat' or 'bowl'
  const [confirming, setConfirming] = useState(false);
  const [matchCreated, setMatchCreated] = useState(false);
  const [sound, setSound] = useState();
  const [error, setError] = useState(null);
  const coinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [coinSide, setCoinSide] = useState('heads');

  // Load match request and teams
  useEffect(() => {
    (async () => {
      try {
      setLoading(true);
        setError(null);
        
      const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          throw new Error('User not authenticated');
        }
        setUser(session.user);
        
        const { data: reqData, error: reqError } = await supabase
          .from('match_requests')
          .select('*')
          .eq('id', matchRequestId)
          .single();
          
        if (reqError) throw reqError;
        if (!reqData) throw new Error('Match request not found');
        
      setRequest(reqData);
        
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .in('id', [reqData.sender_team_id, reqData.receiver_team_id]);
          
        if (teamsError) throw teamsError;
        
      const team1 = teamsData.find(t => t.id === reqData.sender_team_id);
      const team2 = teamsData.find(t => t.id === reqData.receiver_team_id);
        
        if (!team1 || !team2) {
          throw new Error('Team information not found');
        }
        
      setTeams({ team1, team2 });
        setIsOpponentCreator(session.user.id === reqData.receiver_user_id);
        
      } catch (err) {
        console.error('Error loading coin toss data:', err);
        setError(err.message);
      } finally {
      setLoading(false);
      }
    })();
  }, [matchRequestId]);

  // Enhanced coin flip animation
  const playCoinFlip = async () => {
    try {
      setTossState('flipping');
      
      // Enhanced haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      // Play sound with proper error handling
      try {
        const { sound: audioSound } = await Audio.Sound.createAsync(
          require('../assets/sounds/coin-flip.mp4') // Fixed: using correct file extension
        );
        setSound(audioSound);
        await audioSound.playAsync();
      } catch (audioError) {
        console.log('Audio not available:', audioError);
        // Continue without audio - this prevents the module error
      }
      
      // Enhanced coin animation with scale effect
    coinAnim.setValue(0);
      scaleAnim.setValue(1);
      
      // Scale up animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        })
      ]).start();
      
      // Main flip animation
    Animated.timing(coinAnim, {
      toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
        // Fair random winner with better randomization
      const winner = Math.random() < 0.5 ? teams.team1 : teams.team2;
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
        
      setCoinSide(result);
      setFlipResult(result);
      setWinnerTeam(winner);
      setTossState('result');
        
        // Success haptic feedback
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 300);
    });
      
    } catch (err) {
      console.error('Error during coin flip:', err);
      setTossState('ready');
      Alert.alert('Error', 'Failed to flip coin. Please try again.');
    }
  };

  // Clean up sound
  useEffect(() => {
    return sound ? () => { 
      try {
        sound.unloadAsync();
      } catch (e) {
        console.log('Error unloading sound:', e);
      }
    } : undefined;
  }, [sound]);

  // Enhanced confirm toss and create match
  const handleConfirmToss = async () => {
    if (!request || !teams.team1 || !teams.team2) {
      Alert.alert('Error', 'Missing match data. Please try again.');
      return;
    }
    
    setConfirming(true);
    try {
      // Fetch player lists from teams with error handling
      const { data: team1Data, error: team1Error } = await supabase
        .from('teams')
        .select('players')
        .eq('id', teams.team1.id)
        .single();
        
      if (team1Error) throw team1Error;
      
      const { data: team2Data, error: team2Error } = await supabase
        .from('teams')
        .select('players')
        .eq('id', teams.team2.id)
        .single();
        
      if (team2Error) throw team2Error;

      // Fixed payload with correct field names
        const payload = {
        created_by: request.created_by, // Fixed: was creatorid
          team1_id: request.sender_team_id,
          team2_id: request.receiver_team_id,
        match_title: request.match_title || 'Friendly Match',
        match_type: request.match_type || 'friendly',
        overs: request.overs || 10,
        ball_type: request.ball_type || 'tennis',
        scheduled_at: new Date().toISOString(),
        toss_caller: teams.team2.created_by,
        toss_call: flipResult,
          toss_result: flipResult,
        toss_winner: winnerTeam.created_by,
        toss_winner_team: winnerTeam.id,
        toss_choice: tossChoice,
          toss_time: new Date().toISOString(),
          status: 'live',
        team1_players: team1Data?.players || [],
        team2_players: team2Data?.players || [],
          created_at: new Date().toISOString(),
        };

      console.log('Creating match with payload:', payload);
      
      const { data, error } = await supabase
        .from('matches')
        .insert([payload])
        .select();
        
        if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('Failed to create match');
      }
      
        const matchId = data[0].id;
      console.log('Match created successfully:', matchId);
      
      // Update match request with match ID
      const { error: updateError } = await supabase
        .from('match_requests')
        .update({ match_id: matchId })
        .eq('id', matchRequestId);
        
      if (updateError) {
        console.error('Error updating match request:', updateError);
      }
      
      // Create match performances with proper error handling
      try {
        const team1Players = Array.isArray(team1Data?.players) 
          ? team1Data.players 
          : JSON.parse(team1Data?.players || '[]');
        const team2Players = Array.isArray(team2Data?.players) 
          ? team2Data.players 
          : JSON.parse(team2Data?.players || '[]');
        
        const perfRows = [
          ...team1Players.map((player, idx) => ({
            match_id: matchId,
            player_id: player.id,
            team_id: teams.team1.id,
            status: 'not_submitted',
            runs: null,
            balls_faced: null,
            fours: null,
            sixes: null,
            wickets: null,
            overs: null,
            runs_conceded: null,
            economy_rate: null,
            strike_rate: null,
            batting_order: idx + 1,
            out_type: null,
            catches: null,
            runouts: null,
            stumps: null,
            not_out: null,
            extras_bowled: null,
            player_role: player.role || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
          ...team2Players.map((player, idx) => ({
            match_id: matchId,
            player_id: player.id,
            team_id: teams.team2.id,
            status: 'not_submitted',
            runs: null,
            balls_faced: null,
            fours: null,
            sixes: null,
            wickets: null,
            overs: null,
            runs_conceded: null,
            economy_rate: null,
            strike_rate: null,
            batting_order: idx + 1,
            out_type: null,
            catches: null,
            runouts: null,
            stumps: null,
            not_out: null,
            extras_bowled: null,
            player_role: player.role || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
        ];
        
        if (perfRows.length > 0) {
          const { error: perfError } = await supabase
            .from('match_performances')
            .insert(perfRows);
            
        if (perfError) {
            console.error('Error creating match performances:', perfError);
            // Don't fail the whole process for this
          }
        }
      } catch (perfError) {
        console.error('Error processing match performances:', perfError);
        // Continue without match performances
      }
      
      setMatchCreated(true);
      
      // Success feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to Matches tab after delay
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'Matches' } }],
        });
      }, 2000);
      
      } catch (err) {
      console.error('Error creating match:', err);
      Alert.alert('Error', err.message || 'Could not create match. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  // Enhanced coin flip rotation with scale
  const rotateY = coinAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '1800deg', '3600deg'],
  });

  // Error state
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading toss...</Text>
      </View>
    );
  }

  if (!request || !teams.team1 || !teams.team2) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Match data not found</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isOpponentCreator) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notAllowedText}>
          🚫 Only the opponent team creator can perform the toss.
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main UI
  return (
    <View style={styles.bgContainer}>
      <Image source={STADIUM_BG} style={styles.bgImage} resizeMode="cover" />
      <View style={styles.overlay} />
      <View style={styles.content}>
        {/* Enhanced Match Summary */}
        <View style={styles.matchSummary}>
          <Text style={styles.matchTitle}>
            🏏 {request.match_title || 'Friendly Match'}
          </Text>
          <View style={styles.teamsContainer}>
            <Text style={styles.teamName}>{teams.team1.name}</Text>
            <Text style={styles.vsText}>🆚</Text>
            <Text style={styles.teamName}>{teams.team2.name}</Text>
          </View>
          <View style={styles.matchDetails}>
            <Text style={styles.detailText}>
              ⏱️ Overs: <Text style={styles.detailValue}>{request.overs}</Text>
            </Text>
            <Text style={styles.detailText}>
              🥎 Ball: <Text style={styles.detailValue}>{request.ball_type}</Text>
            </Text>
            <Text style={styles.detailText}>
              📅 {new Date(request.scheduled_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Enhanced Coin Container */}
        <View style={styles.coinContainer}>
          {tossState === 'ready' && (
            <View style={styles.readyState}>
              <Text style={styles.readyText}>🎯 Ready to Toss?</Text>
              <TouchableOpacity 
                style={styles.flipButton} 
                onPress={playCoinFlip}
                activeOpacity={0.8}
              >
                <Text style={styles.flipButtonText}>🪙 Flip the Coin</Text>
            </TouchableOpacity>
            </View>
          )}
          
          {(tossState === 'flipping' || tossState === 'result') && (
            <View style={styles.coinWrapper}>
              <Animated.View style={[
                styles.coin, 
                { 
                  transform: [
                    { rotateY },
                    { scale: scaleAnim }
                  ] 
                }
              ]}> 
                <View style={styles.coinFace}>
                  {/* Custom coin design instead of PNG */}
                  <View style={styles.coinDesign}>
                    <View style={styles.coinCenter}>
                      <Text style={styles.coinIcon}>
                        {coinSide === 'heads' ? '🏏' : '🥎'}
                      </Text>
                    </View>
                    <View style={styles.coinRing}>
                      <Text style={styles.coinRingText}>
                        {coinSide === 'heads' ? 'HEADS' : 'TAILS'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.coinOverlay}>
                    <Text style={styles.coinSideText}>
                      {coinSide === 'heads' ? 'HEADS' : 'TAILS'}
                    </Text>
                  </View>
                </View>
                <View style={styles.coinEdge} />
            </Animated.View>
            </View>
          )}
          
          {tossState === 'flipping' && (
            <View style={styles.flippingState}>
              <Text style={styles.flippingText}>🎲 Flipping...</Text>
            </View>
          )}
          
          {tossState === 'result' && winnerTeam && (
            <View style={styles.resultBox}>
              <Text style={styles.resultEmoji}>
                {flipResult === 'heads' ? '🪙' : '🪙'}
              </Text>
              <Text style={styles.resultText}>
                {winnerTeam.name} won the toss!
              </Text>
              <Text style={styles.resultSubtext}>
                Result: {flipResult.charAt(0).toUpperCase() + flipResult.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Enhanced Toss Decision */}
        {tossState === 'result' && winnerTeam && user.id === winnerTeam.created_by && !tossChoice && (
          <View style={styles.decisionBox}>
            <Text style={styles.decisionPrompt}>
              🎉 You won the toss! What would you like to do?
            </Text>
            <View style={styles.decisionButtonsRow}>
              <TouchableOpacity
                style={[styles.decisionButton, tossChoice === 'bat' && styles.selectedDecision]}
                onPress={() => setTossChoice('bat')}
                activeOpacity={0.8}
              >
                <Text style={styles.decisionEmoji}>🏏</Text>
                <Text style={styles.decisionLabel}>Bat First</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.decisionButton, tossChoice === 'bowl' && styles.selectedDecision]}
                onPress={() => setTossChoice('bowl')}
                activeOpacity={0.8}
              >
                <Text style={styles.decisionEmoji}>🥎</Text>
                <Text style={styles.decisionLabel}>Bowl First</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Enhanced Confirm Button */}
        {tossChoice && tossState === 'result' && user.id === winnerTeam.created_by && !matchCreated && (
          <TouchableOpacity 
            style={styles.confirmButton} 
            onPress={handleConfirmToss} 
            disabled={confirming}
            activeOpacity={0.8}
          >
            {confirming ? (
              <View style={styles.confirmingState}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.confirmButtonText}>Creating Match...</Text>
              </View>
            ) : (
              <Text style={styles.confirmButtonText}>✅ Confirm & Start Match</Text>
            )}
          </TouchableOpacity>
        )}
        
        {/* Enhanced Success State */}
        {matchCreated && (
          <View style={styles.successBox}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.successText}>Match is now live!</Text>
            <Text style={styles.successSubtext}>Redirecting to matches...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bgContainer: {
    flex: 1,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgImage: {
    position: 'absolute',
    width: width,
    height: '100%',
    top: 0,
    left: 0,
    opacity: 0.35,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 30,
  },
  matchSummary: {
    alignItems: 'center',
    marginBottom: 10,
  },
  matchTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 6,
    textAlign: 'center',
  },
  teamsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  detailText: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 2,
  },
  detailValue: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  coinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    minHeight: 220,
  },
  coin: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
    backgroundColor: 'transparent',
  },
  coinImage: {
    width: 140,
    height: 140,
  },
  flipButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 32,
    marginTop: 20,
    marginBottom: 10,
    elevation: 4,
  },
  flipButtonText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 22,
    letterSpacing: 1,
  },
  resultBox: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 18,
    marginTop: 18,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  resultText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
  },
  notAllowedText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: 'bold',
    marginHorizontal: 20,
  },
  decisionBox: {
    marginTop: 18,
    alignItems: 'center',
  },
  decisionPrompt: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 12,
    textAlign: 'center',
  },
  decisionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  decisionButton: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 32,
    marginHorizontal: 10,
    alignItems: 'center',
    elevation: 3,
    borderWidth: 2,
    borderColor: '#FFD700',
    minWidth: 120,
  },
  selectedDecision: {
    backgroundColor: '#FFD700',
    borderColor: '#2E7D32',
  },
  decisionEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  decisionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  confirmButton: {
    backgroundColor: '#4cd137',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    marginTop: 18,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  retryButtonText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 18,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  teamName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  vsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginHorizontal: 10,
  },
  matchDetails: {
    alignItems: 'center',
  },
  readyState: {
    alignItems: 'center',
    marginBottom: 20,
  },
  readyText: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  flippingState: {
    alignItems: 'center',
    marginBottom: 20,
  },
  flippingText: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
  },
  resultEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  resultSubtext: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successBox: {
    alignItems: 'center',
    marginTop: 20,
  },
  successEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  successText: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
  },
  successSubtext: {
    color: '#fff',
    fontSize: 16,
  },
  confirmingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinWrapper: {
    position: 'relative',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coin: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: 'transparent',
  },
  coinFace: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  coinImage: {
    width: '100%',
    height: '100%',
  },
  coinOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinSideText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  coinEdge: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#FFD700',
    borderStyle: 'dashed',
    opacity: 0.3,
  },
  coinDesign: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 70,
    overflow: 'hidden',
    backgroundColor: '#FFD700',
    borderWidth: 3,
    borderColor: '#B8860B',
    // Add subtle gradient effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  coinCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#B8860B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  coinIcon: {
    fontSize: 32,
  },
  coinRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -55 }, { translateY: -55 }],
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#B8860B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinRingText: {
    color: '#B8860B',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});