import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../utils/supabaseClient';

export default function TournamentWizardScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { tournamentId } = route.params || {};
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState(null); // 'create' or 'join'
  // Create
  const [form, setForm] = useState({ name: '', format: 'Knockout', overs: 6, maxTeams: 4, autoApproval: false });
  const [creating, setCreating] = useState(false);
  // Join
  const [tournaments, setTournaments] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [userTeams, setUserTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [joining, setJoining] = useState(false);
  // Confirmation
  const [confirmation, setConfirmation] = useState(null);
  const [userId, setUserId] = useState(null);
  // Add state for my joined tournaments
  const [myJoinedTournaments, setMyJoinedTournaments] = useState([]);
  const [loadingMyTournaments, setLoadingMyTournaments] = useState(false);

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    fetchUserId();
  }, []);

  // Fetch tournaments for join
  useEffect(() => {
    if (step === 2 && mode === 'join') {
      setLoadingTournaments(true);
      supabase.from('tournaments').select('*').eq('status', 'published').then(({ data }) => {
        setTournaments(data || []);
        setLoadingTournaments(false);
      });
    }
  }, [step, mode]);

  // Fetch user's teams for join
  useEffect(() => {
    if (step === 3 && mode === 'join' && userId) {
              supabase.from('teams').select('*').eq('is_deleted', false).then(({ data }) => {
        // Only teams where user is creator or in players array
        const myTeams = (data || []).filter(team => {
          if (team.created_by === userId) return true;
          // Parse players if it's a string
          let playersArr = team.players;
          if (typeof playersArr === 'string') {
            try {
              playersArr = JSON.parse(playersArr);
            } catch {
              playersArr = [];
            }
          }
          if (Array.isArray(playersArr)) {
            return playersArr.some(p => p.id === userId);
          }
          return false;
        });
        setUserTeams(myTeams);
      });
    }
  }, [step, mode, userId]);

  // Handle deep link for join
  useEffect(() => {
    if (tournamentId) {
      setMode('join');
      // Fetch the tournament by ID and go to team selection
      const fetchTournament = async () => {
        const { data, error } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
        if (data) {
          setSelectedTournament(data);
          setStep(3); // Go directly to team selection
        } else {
          Alert.alert('Error', 'Tournament not found.');
        }
      };
      fetchTournament();
    }
  }, [tournamentId]);

  // Fetch user's joined tournaments on mount and when userId changes
  useEffect(() => {
    const fetchMyJoinedTournaments = async () => {
      setLoadingMyTournaments(true);
      let userTeams = [];
      const { data: teamsData } = await supabase.from('teams').select('*').eq('is_deleted', false);
      if (teamsData && userId) {
        userTeams = (teamsData || []).filter(team => {
          if (team.created_by === userId) return true;
          let playersArr = team.players;
          if (typeof playersArr === 'string') {
            try { playersArr = JSON.parse(playersArr); } catch { playersArr = []; }
          }
          if (Array.isArray(playersArr)) {
            return playersArr.some(p => p.id === userId);
          }
          return false;
        });
      }
      const userTeamIds = userTeams.map(t => t.id);
      // Fetch tournament_teams for these teams
      let tournamentTeamRows = [];
      if (userTeamIds.length > 0) {
        const { data: ttr } = await supabase.from('tournament_teams').select('*').in('team_id', userTeamIds);
        tournamentTeamRows = ttr || [];
      }
      // Fetch tournaments for these tournament_ids
      const tournamentIds = [...new Set(tournamentTeamRows.map(row => row.tournament_id))];
      let tournaments = [];
      if (tournamentIds.length > 0) {
        const { data: tdata } = await supabase.from('tournaments').select('*').in('id', tournamentIds);
        tournaments = tdata || [];
      }
      setMyJoinedTournaments(tournaments);
      setLoadingMyTournaments(false);
    };
    if (userId) fetchMyJoinedTournaments();
  }, [userId]);

  // Step 1: Create/Join + Joined Tournaments Grid
  if (step === 1) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Tournaments</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24 }}>
          <TouchableOpacity style={[styles.button, { marginRight: 12 }]} onPress={() => { setMode('create'); setStep(2); }}>
            <Text style={styles.buttonText}>Create</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => { setMode('join'); setStep(2); }}>
            <Text style={styles.buttonText}>Join</Text>
        </TouchableOpacity>
        </View>
        <View style={{ width: '100%', marginBottom: 8 }}>
          <Text style={styles.sectionTitle}>Joined Tournaments</Text>
        </View>
        {loadingMyTournaments ? <ActivityIndicator /> : (
          <FlatList
            data={myJoinedTournaments}
            keyExtractor={item => item.id}
            numColumns={2}
            contentContainerStyle={{ alignItems: 'center' }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.tournamentCard}
                onPress={() => navigation.navigate('TournamentDetail', { tournamentId: item.id })}
              >
                <Text style={styles.tournamentName}>{item.name}</Text>
                <Text style={styles.tournamentInfo}>{item.format} | {item.overs_per_match} overs</Text>
        </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{ color: '#888', marginTop: 12 }}>No tournaments joined yet.</Text>}
          />
        )}
      </View>
    );
  }

  // Step 2: Tournament Details (Create)
  if (step === 2 && mode === 'create') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Create Tournament</Text>
        <TextInput placeholder="Tournament Name" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} style={styles.input} />
        <Text>Format</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setForm(f => ({ ...f, format: f.format === 'Knockout' ? 'League' : 'Knockout' }))}>
          <Text>{form.format}</Text>
        </TouchableOpacity>
        <TextInput placeholder="Overs per Match" value={String(form.overs)} onChangeText={v => setForm(f => ({ ...f, overs: v.replace(/\D/g, '') }))} keyboardType="numeric" style={styles.input} />
        <TextInput placeholder="Max Teams Allowed" value={String(form.maxTeams)} onChangeText={v => setForm(f => ({ ...f, maxTeams: v.replace(/\D/g, '') }))} keyboardType="numeric" style={styles.input} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
          <Text>Auto-approve Teams</Text>
          <TouchableOpacity onPress={() => setForm(f => ({ ...f, autoApproval: !f.autoApproval }))} style={{ marginLeft: 8 }}>
            <Text>{form.autoApproval ? 'Yes' : 'No'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.button} onPress={async () => {
          if (!form.name || !form.overs || !form.maxTeams) {
            Alert.alert('Error', 'Please fill all fields');
            return;
          }
          if (!userId) {
            Alert.alert('Error', 'User not logged in.');
            return;
          }
          console.log('Creating tournament with:', {
            ...form,
            organizer_id: userId,
            prize_pool: 0
          });
          setCreating(true);
          const { data, error } = await supabase.from('tournaments').insert({
            name: form.name,
            format: form.format.toLowerCase(),
            overs_per_match: Number(form.overs),
            max_teams: Number(form.maxTeams),
            status: 'published',
            auto_approval: form.autoApproval,
            organizer_id: userId,
            prize_pool: 0, // Always provide a value
          }).select('*').single();
          setCreating(false);
          if (error) {
            console.log('Insert error:', error);
            Alert.alert('Error', error.message);
            return;
          }
          setConfirmation({ type: 'create', tournament: data });
          setStep(4);
        }}>
          {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonAlt} onPress={() => setStep(1)}>
          <Text style={styles.buttonTextAlt}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 2: Select Tournament (Join)
  if (step === 2 && mode === 'join') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Join Tournament</Text>
        {loadingTournaments ? <ActivityIndicator /> : (
          <FlatList
            data={tournaments}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.listItem} onPress={() => { setSelectedTournament(item); setStep(3); }}>
                <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                <Text>{item.format} | {item.overs_per_match} overs</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text>No tournaments available.</Text>}
          />
        )}
        <TouchableOpacity style={styles.buttonAlt} onPress={() => setStep(1)}>
          <Text style={styles.buttonTextAlt}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 3: Select Team (Join)
  if (step === 3 && mode === 'join') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Select Your Team</Text>
        <FlatList
          data={userTeams}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.listItem} onPress={() => setSelectedTeamId(item.id)}>
              <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text>No teams found.</Text>}
        />
        <TouchableOpacity style={styles.button} onPress={async () => {
          if (!selectedTeamId) {
            Alert.alert('Select Team', 'Please select a team.');
            return;
          }
          setJoining(true);
          const { error } = await supabase.from('tournament_teams').insert({
            tournament_id: selectedTournament.id,
            team_id: selectedTeamId,
            status: selectedTournament.auto_approval ? 'approved' : 'requested',
            entry_fee_paid: true,
          });
          setJoining(false);
          if (error) {
            Alert.alert('Error', error.message);
            return;
          }
          setConfirmation({ type: 'join', tournament: selectedTournament });
          setStep(4);
        }}>
          {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Join</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonAlt} onPress={() => setStep(2)}>
          <Text style={styles.buttonTextAlt}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 4: Confirmation
  if (step === 4) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Success!</Text>
        {confirmation?.type === 'create' ? (
          <Text>You created the tournament: {confirmation.tournament.name}</Text>
        ) : (
          <Text>You requested to join: {confirmation.tournament.name}</Text>
        )}
        <TouchableOpacity style={styles.button} onPress={() => {
          navigation.navigate('TournamentDetail', { tournamentId: confirmation.tournament.id });
        }}>
          <Text style={styles.buttonText}>Go to Tournament</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, alignSelf: 'flex-start' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12, width: 260 },
  button: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 8, marginBottom: 16, width: 120, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  buttonAlt: { backgroundColor: '#eee', padding: 16, borderRadius: 8, width: 220, alignItems: 'center' },
  buttonTextAlt: { color: '#2E7D32', fontWeight: 'bold', fontSize: 16 },
  picker: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12, width: 260, backgroundColor: '#fafafa' },
  listItem: { padding: 16, borderBottomWidth: 1, borderColor: '#eee', width: 260 },
  tournamentCard: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#4CAF50', borderRadius: 12, padding: 16, margin: 8, width: 140, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  tournamentName: { fontWeight: 'bold', fontSize: 16, marginBottom: 6, textAlign: 'center' },
  tournamentInfo: { color: '#555', fontSize: 14, textAlign: 'center' },
}); 