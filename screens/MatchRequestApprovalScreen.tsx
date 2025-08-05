import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, ScrollView, Modal, Button } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../utils/supabaseClient';

export default function MatchRequestApprovalScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { matchRequestId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [sender, setSender] = useState(null);
  const [senderTeam, setSenderTeam] = useState(null);
  const [receiverTeam, setReceiverTeam] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showTossChoiceModal, setShowTossChoiceModal] = useState(false);
  const [userId, setUserId] = useState(null);
  const [match, setMatch] = useState(null);

  useEffect(() => {
    let subscription;
    
    const fetchRequestDetails = async () => {
      if (!matchRequestId) return;
      
      try {
        // Fetch match request
        const { data: reqData, error: reqError } = await supabase
          .from('match_requests')
          .select('*')
          .eq('id', matchRequestId)
          .single();
        
        if (reqError) throw reqError;
        setRequest(reqData);

        // Fetch sender info
        if (reqData.created_by) {
          const { data: senderData } = await supabase
            .from('users')
            .select('username, avatar_url')
            .eq('id', reqData.created_by)
            .single();
          setSender(senderData);
        }

        // Fetch teams info
        const { data: teamsData } = await supabase
          .from('teams')
          .select('*')
          .in('id', [reqData.sender_team_id, reqData.receiver_team_id]);
        
        const senderTeamData = teamsData?.find(t => t.id === reqData.sender_team_id);
        const receiverTeamData = teamsData?.find(t => t.id === reqData.receiver_team_id);
        
        setSenderTeam(senderTeamData);
        setReceiverTeam(receiverTeamData);

        setLoading(false);

        // Setup real-time subscription for match request updates
        subscription = supabase
          .channel(`match_request_${matchRequestId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'match_requests',
              filter: `id=eq.${matchRequestId}`,
            },
            (payload) => {
              console.log('Real-time match request update:', payload);
              const updatedRequest = payload.new;
              setRequest(updatedRequest);

              // If request is approved, navigate to toss screen
              if (updatedRequest.status === 'approved') {
                setTimeout(() => {
                  navigation.replace('CoinTossScreen', { 
                    matchRequestId,
                    isApproved: true 
                  });
                }, 1000);
              }
            }
          )
          .subscribe();

        // Setup real-time subscription for match updates (if match exists)
        if (reqData.match_id) {
          const matchSubscription = supabase
            .channel(`match_${reqData.match_id}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'matches',
                filter: `id=eq.${reqData.match_id}`,
              },
              (payload) => {
                console.log('Real-time match update:', payload);
                const updatedMatch = payload.new;
                setMatch(updatedMatch);
              }
            )
            .subscribe();

          // Fetch existing match
          const { data: matchData } = await supabase
            .from('matches')
            .select('*')
            .eq('id', reqData.match_id)
            .single();
          setMatch(matchData);
        }

      } catch (error) {
        console.error('Error fetching request details:', error);
        Alert.alert('Error', 'Failed to load match request details');
        setLoading(false);
      }
    };

    fetchRequestDetails();
    
    // Fetch current user ID
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
    })();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [matchRequestId, navigation]);

  const handleAccept = async () => {
    setProcessing(true);
    try {
      // Update match request status to approved
      const { error: updateError } = await supabase
        .from('match_requests')
        .update({ status: 'approved' })
        .eq('id', matchRequestId);
      
      if (updateError) throw updateError;

      // Send notification to sender
      const notificationPayload = {
        userid: request.created_by,
        title: 'Match Request Accepted',
        message: `Your match request for '${request.match_title || 'Match'}' has been accepted!`,
        type: 'match_accepted',
        read: false,
        created_at: new Date().toISOString(),
        match_request_id: matchRequestId,
      };

      const { error: notifError } = await supabase.from('notifications').insert([notificationPayload]);
      if (notifError) {
        console.log('Notification error:', notifError);
      }

      // Navigate to toss screen automatically (will be handled by real-time subscription)
      setProcessing(false);
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept match request');
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    setProcessing(true);
    try {
      // Update match request status to declined
      const { error: updateError } = await supabase
        .from('match_requests')
        .update({ status: 'declined' })
        .eq('id', matchRequestId);
      
      if (updateError) throw updateError;

      // Send notification to sender
      const notificationPayload = {
        userid: request.created_by,
        title: 'Match Request Declined',
        message: `Your match request for '${request.match_title || 'Match'}' has been declined.`,
        type: 'match_declined',
        read: false,
        created_at: new Date().toISOString(),
        match_request_id: matchRequestId,
      };

      const { error: notifError } = await supabase.from('notifications').insert([notificationPayload]);
      if (notifError) {
        console.log('Notification error:', notifError);
      }

      Alert.alert('Declined', 'Match request has been declined.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error declining request:', error);
      Alert.alert('Error', 'Failed to decline match request');
      setProcessing(false);
    }
  };

  // Toss choice handler
  const handleTossChoice = async (choice) => {
    if (!match) return;
    await supabase.from('matches').update({ toss_choice: choice }).eq('id', match.id);
    setShowTossChoiceModal(false);
    navigation.replace('LiveMatchSummaryScreen', { matchId: match.id });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4cd137" />
        <Text style={styles.loadingText}>Loading match request...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Match request not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Match Request</Text>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sender Info */}
        <View style={styles.senderCard}>
          <View style={styles.senderHeader}>
            {sender?.avatar_url ? (
              <Image source={{ uri: sender.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
            <View style={styles.senderInfo}>
              <Text style={styles.senderName}>{sender?.username || 'Unknown User'}</Text>
              <Text style={styles.senderLabel}>wants to play against your team</Text>
            </View>
          </View>
        </View>

        {/* Match Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Match Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Match Title:</Text>
            <Text style={styles.detailValue}>{request.match_title || 'Untitled Match'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Match Type:</Text>
            <Text style={styles.detailValue}>{request.match_type}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Overs:</Text>
            <Text style={styles.detailValue}>{request.overs}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ball Type:</Text>
            <Text style={styles.detailValue}>{request.ball_type}</Text>
          </View>

          {request.scheduled_at && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Scheduled:</Text>
              <Text style={styles.detailValue}>
                {new Date(request.scheduled_at).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Teams */}
        <View style={styles.teamsCard}>
          <Text style={styles.sectionTitle}>Teams</Text>
          
          <View style={styles.teamRow}>
            <View style={styles.teamInfo}>
              <Text style={styles.teamLabel}>Challenger Team:</Text>
              <Text style={styles.teamName}>{senderTeam?.name}</Text>
            </View>
          </View>

          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          <View style={styles.teamRow}>
            <View style={styles.teamInfo}>
              <Text style={styles.teamLabel}>Your Team:</Text>
              <Text style={styles.teamName}>{receiverTeam?.name}</Text>
            </View>
          </View>
        </View>

        {/* Status Display */}
        {request.status !== 'pending' && (
          <View style={styles.statusCard}>
            <Text style={styles.sectionTitle}>Status</Text>
            <Text style={[
              styles.statusText,
              { color: request.status === 'approved' ? '#4cd137' : '#ff6b6b' }
            ]}>
              {request.status === 'approved' ? '✅ Approved' : '❌ Declined'}
            </Text>
            {request.status === 'approved' && (
              <Text style={styles.statusSubtext}>
                Navigating to toss screen...
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {request.status === 'pending' && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={handleDecline}
            disabled={processing}
          >
            <Text style={styles.declineButtonText}>
              {processing ? 'Declining...' : 'Decline'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
            disabled={processing}
          >
            <Text style={styles.acceptButtonText}>
              {processing ? 'Accepting...' : 'Accept & Toss'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Choose Bat/Bowl Button for Toss Winner */}
      {match && userId &&
        ((match.toss_winner === senderTeam?.id && senderTeam?.created_by === userId) ||
         (match.toss_winner === receiverTeam?.id && receiverTeam?.created_by === userId)) &&
        !match.toss_choice && (
        <View style={{ padding: 16 }}>
          <Button title="Choose Bat/Bowl" color="#FFD700" onPress={() => setShowTossChoiceModal(true)} />
        </View>
      )}

      {/* Toss Choice Modal */}
      <Modal visible={showTossChoiceModal} transparent animationType="slide" onRequestClose={() => setShowTossChoiceModal(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>You won the toss! Choose:</Text>
            <Button title="Bat First" onPress={() => handleTossChoice('bat')} color="#4cd137" />
            <View style={{ height: 16 }} />
            <Button title="Bowl First" onPress={() => handleTossChoice('bowl')} color="#2196F3" />
            <View style={{ height: 16 }} />
            <Button title="Cancel" onPress={() => setShowTossChoiceModal(false)} color="#888" />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    textAlign: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginVertical: 20,
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  senderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eee',
    marginRight: 12,
  },
  senderInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  senderLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#222',
    fontWeight: 'bold',
  },
  teamsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },
  teamRow: {
    marginVertical: 8,
  },
  teamInfo: {
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  vsContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  vsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f77f1b',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  declineButton: {
    backgroundColor: '#ff6b6b',
  },
  acceptButton: {
    backgroundColor: '#4cd137',
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 