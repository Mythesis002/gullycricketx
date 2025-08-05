import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../utils/supabaseClient';

export default function WaitingForApprovalScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { matchRequestId, matchDetails } = route.params || {};
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [sender, setSender] = useState(null);

  // Simple utility to show 'time ago'
  function timeAgo(date) {
    if (!date) return '';
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff/60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)} hr ago`;
    return `${Math.floor(diff/86400)} days ago`;
  }

  useEffect(() => {
    let subscription;
    
    const setupRealtimeSubscription = async () => {
      if (!matchRequestId) return;

      // Initial fetch
      const { data, error } = await supabase
        .from('match_requests')
        .select('*')
        .eq('id', matchRequestId)
        .single();
      
      if (error) {
        console.error('Error fetching match request:', error);
        return;
      }
      
      setStatus(data.status);
      setRequest(data);
      setLoading(false);

      // Fetch sender info
      if (data.created_by) {
        const { data: senderData } = await supabase
          .from('users')
          .select('username, avatar_url')
          .eq('id', data.created_by)
          .single();
        setSender(senderData);
      }

      // Setup real-time subscription
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
            console.log('Real-time update received:', payload);
            const updatedRequest = payload.new;
            setStatus(updatedRequest.status);
            setRequest(updatedRequest);

            // Handle status changes
            if (updatedRequest.status === 'approved') {
              // Navigate to toss screen automatically
              setTimeout(() => {
                navigation.replace('CoinTossScreen', { 
                  matchRequestId,
                  isApproved: true 
                });
              }, 1000); // Small delay to show the approved status
            } else if (updatedRequest.status === 'declined') {
              Alert.alert('Declined', 'Your match request has been declined.', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            }
          }
        )
        .subscribe();

      // Handle initial status
      if (data.status === 'approved') {
        setTimeout(() => {
          navigation.replace('CoinTossScreen', { 
            matchRequestId,
            isApproved: true 
          });
        }, 1000);
      } else if (data.status === 'declined') {
        Alert.alert('Declined', 'Your match request has been declined.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [matchRequestId, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Match Request</Text>
      <View style={styles.detailsCard}>
        {/* Sender Name and Time Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          {sender?.avatar_url ? (
            <Image source={{ uri: sender.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
          ) : (
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee', marginRight: 10 }} />
          )}
          <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#222', marginRight: 8 }}>
            {sender?.username || 'Sender'}
          </Text>
          <Text style={{ color: '#888', fontSize: 15 }}>
            {request ? timeAgo(request.created_at) : ''}
          </Text>
        </View>
        <Text style={styles.label}>Your Team:</Text>
        <Text style={styles.value}>{matchDetails?.myTeamName}</Text>
        <Text style={styles.label}>Opponent Team:</Text>
        <Text style={styles.value}>{matchDetails?.opponentTeamName}</Text>
        <Text style={styles.label}>Match Type:</Text>
        <Text style={styles.value}>{matchDetails?.matchType}</Text>
        <Text style={styles.label}>Overs:</Text>
        <Text style={styles.value}>{matchDetails?.overs}</Text>
        <Text style={styles.label}>Ball Type:</Text>
        <Text style={styles.value}>{matchDetails?.ballType}</Text>
        {matchDetails?.scheduledAt && (
          <>
            <Text style={styles.label}>Scheduled At:</Text>
            <Text style={styles.value}>{new Date(matchDetails.scheduledAt).toLocaleString()}</Text>
          </>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
          <Text style={{ fontWeight: 'bold', color: status === 'pending' ? '#FFA500' : status === 'approved' ? '#4cd137' : 'red', fontSize: 16 }}>
            Status: {status === 'approved' ? 'Accepted' : status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
          {loading || status === 'pending' ? (
            <ActivityIndicator size="small" color="#4cd137" style={{ marginLeft: 10 }} />
          ) : null}
        </View>
        
        {status === 'approved' && (
          <View style={{ marginTop: 16, padding: 12, backgroundColor: '#4cd137', borderRadius: 8 }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
              🎉 Request Accepted! Navigating to toss...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 24,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
  },
  label: {
    color: '#888',
    fontWeight: 'bold',
    fontSize: 15,
    marginTop: 8,
  },
  value: {
    color: '#222',
    fontSize: 16,
    marginBottom: 2,
  },
  statusText: {
    color: '#4cd137',
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: 24,
    textAlign: 'center',
  },
}); 