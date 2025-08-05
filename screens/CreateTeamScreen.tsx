import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Modal, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabaseClient';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');
const GROUND_SIZE = width * 0.95;
const PITCH_WIDTH = GROUND_SIZE * 0.28;
const PITCH_HEIGHT = GROUND_SIZE * 0.5;

const ROLES = [
  'Batsman',
  'Bowler',
  'All-rounder',
  'Wicketkeeper',
  'Captain',
];

function getInitials(id) {
  if (!id) return '';
  return id.slice(0, 2).toUpperCase();
}

function getMimeType(uri) {
  const ext = uri.split('.').pop().toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  return 'application/octet-stream';
}

export default function CreateTeamScreen({ navigation: navProp }) {
  const route = useRoute();
  const navigation = navProp || useNavigation();
  const { teamName: navTeamName, logoUri, description } = route.params || {};
  const [teamName, setTeamName] = useState(navTeamName || '');
  const [teamDescription, setTeamDescription] = useState(description || '');
  const [players, setPlayers] = useState([]); // { id, role }
  const [modalVisible, setModalVisible] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [playerRole, setPlayerRole] = useState(ROLES[0]);
  const [adding, setAdding] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [editRole, setEditRole] = useState(ROLES[0]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]); // [{ id, name }]
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); // { id, name }
  const searchTimeout = useRef(null);
  const [logoUrl, setLogoUrl] = useState(null);

  // Debounced search
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, profilePicture')
          .ilike('name', `%${search.trim()}%`)
          .limit(10);
        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(searchTimeout.current);
  }, [search]);

  // Updated validation for selectedUser
  const validatePlayer = () => {
    if (!selectedUser) {
      Alert.alert('Error', 'Please select a player');
      return false;
    }
    if (players.some(p => p.id === selectedUser.id)) {
      Alert.alert('Error', 'Player already added');
      return false;
    }
    if (playerRole === 'Captain' && players.some(p => p.role === 'Captain')) {
      Alert.alert('Error', 'Only one Captain allowed');
      return false;
    }
    return true;
  };

  const handleAddPlayer = () => {
    if (!validatePlayer()) return;
    setPlayers([...players, { id: selectedUser.id, name: selectedUser.name, role: playerRole, profilePicture: selectedUser.profilePicture }]);
    setPlayerId('');
    setPlayerRole(ROLES[0]);
    setSelectedUser(null);
    setSearch('');
    setSearchResults([]);
    setModalVisible(false);
  };

  // Calculate avatar positions
  const AVATAR_RADIUS = 32;
  const CIRCLE_RADIUS = GROUND_SIZE / 2 - AVATAR_RADIUS - 12;
  const centerX = GROUND_SIZE / 2;
  const centerY = GROUND_SIZE / 2;

  // Remove player
  const handleRemovePlayer = () => {
    setPlayers(players.filter(p => p.id !== selectedPlayer.id));
    setManageModalVisible(false);
    setSelectedPlayer(null);
  };

  // Edit role
  const handleEditRole = () => {
    // Only one captain allowed
    if (editRole === 'Captain' && players.some(p => p.role === 'Captain' && p.id !== selectedPlayer.id)) {
      Alert.alert('Error', 'Only one Captain allowed');
        return;
      }
    setPlayers(players.map(p =>
      p.id === selectedPlayer.id ? { ...p, role: editRole } : p
    ));
    setManageModalVisible(false);
    setSelectedPlayer(null);
  };

  // Promote to Captain
  const handlePromoteToCaptain = () => {
    setPlayers(players.map(p =>
      p.id === selectedPlayer.id
        ? { ...p, role: 'Captain' }
        : p.role === 'Captain'
          ? { ...p, role: 'Batsman' } // Demote previous captain to Batsman (or keep their old role if you want)
          : p
    ));
    setManageModalVisible(false);
    setSelectedPlayer(null);
  };

  const renderPlayerAvatars = () => {
    const N = players.length;
    if (N === 0) return null;
    return players.map((player, idx) => {
      const angle = (2 * Math.PI * idx) / N - Math.PI / 2; // Start from top
      const x = centerX + CIRCLE_RADIUS * Math.cos(angle) - AVATAR_RADIUS;
      const y = centerY + CIRCLE_RADIUS * Math.sin(angle) - AVATAR_RADIUS;
      return (
        <TouchableOpacity
          key={player.id}
          style={[
            styles.avatarContainer,
            { left: x, top: y },
          ]}
          onPress={() => {
            setSelectedPlayer(player);
            setEditRole(player.role);
            setManageModalVisible(true);
          }}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(player.id)}</Text>
            {player.role === 'Captain' && (
              <View style={styles.captainBadge}>
                <Text style={styles.captainBadgeText}>C</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    });
  };

  // Team validation
  const isTeamValid = () => {
    if (!teamName.trim()) return false;
    if (players.length < 3 || players.length > 11) return false;
    if (players.filter(p => p.role === 'Captain').length !== 1) return false;
    const uniqueIds = new Set(players.map(p => p.id));
    if (uniqueIds.size !== players.length) return false;
    return true;
  };

  // Upload logo to Supabase Storage
  const uploadLogo = async () => {
    if (!logoUri) return null;
    try {
      const fileExt = logoUri.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const fileType = getMimeType(logoUri);
      // Read file as binary (Uint8Array)
      const fileData = await FileSystem.readAsStringAsync(logoUri, { encoding: FileSystem.EncodingType.Base64 });
      const fileBuffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));
      const { data, error } = await supabase.storage
        .from('team-logos')
        .upload(fileName, fileBuffer, {
          contentType: fileType,
          upsert: true,
        });
      if (error) {
        console.error('Supabase upload error:', error.message);
        throw error;
      }
      // Get public URL
      const { data: publicUrlData } = supabase.storage.from('team-logos').getPublicUrl(fileName);
      return publicUrlData?.publicUrl || null;
    } catch (err) {
      console.error('Failed to upload logo:', err);
      Alert.alert('Error', 'Failed to upload logo.');
      return null;
    }
  };

  const handleSaveTeam = async () => {
    console.log('Save button pressed');
    console.log('Team name:', teamName);
    console.log('Players:', players);
    console.log('Is team valid:', isTeamValid());
    
    if (!teamName.trim()) {
      Alert.alert('Error', 'Please enter a team name.');
      return;
    }
    if (players.length < 3 || players.length > 11) {
      Alert.alert('Error', 'Team must have 3 to 11 players.');
      return;
    }
    if (players.filter(p => p.role === 'Captain').length !== 1) {
      Alert.alert('Error', 'Team must have exactly 1 Captain.');
      return;
    }
    const uniqueIds = new Set(players.map(p => p.id));
    if (uniqueIds.size !== players.length) {
      Alert.alert('Error', 'Each player must be unique.');
      return;
    }
    // Get current user ID
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    console.log('Current user ID:', userId);
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to create a team.');
      return;
    }
    setSaving(true);
    let uploadedLogoUrl = logoUrl;
    if (logoUri && !logoUrl) {
      uploadedLogoUrl = await uploadLogo();
      setLogoUrl(uploadedLogoUrl);
    }
    const payload = {
      name: teamName.trim(),
      description: teamDescription,
      logo_url: uploadedLogoUrl,
      players: players,
      createdat: Date.now(),
      created_by: userId,
      captainId: userId,
    };
    console.log('Payload to be inserted:', payload);
    try {
      const { error } = await supabase.from('teams').insert([
        payload,
      ]);
      if (error) throw error;
      Alert.alert('Success', 'Team saved to Supabase!');
      // Navigate back to TeamsScreen
      navigation.goBack();
    } catch (err) {
      console.error('Error saving team:', err);
      Alert.alert('Error', err.message || 'Failed to save team.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Team Name Input */}
      <TextInput
        style={styles.teamNameInputRef}
        placeholder="Team name"
        value={teamName}
        onChangeText={setTeamName}
        placeholderTextColor="#8a98a9"
        textAlign="center"
        accessibilityLabel="Team Name"
      />
      {/* Cricket Ground Visualization */}
      <View style={styles.groundWrapper}>
        {/* Outer Circle */}
        <View style={styles.groundOuter}>
          {/* Middle Circle */}
          <View style={styles.groundMiddle}>
            {/* Inner Circle */}
            <View style={styles.groundInner}>
              {/* Pitch */}
              <View style={styles.pitchRef} />
            </View>
          </View>
          {/* Player Avatars Around the Ground */}
          {players.map((player, idx) => {
            const N = players.length;
            const angle = (2 * Math.PI * idx) / N - Math.PI / 2;
            const radius = styles.groundOuter.width / 2 - 48;
            const x = (styles.groundOuter.width / 2) + radius * Math.cos(angle) - 36;
            const y = (styles.groundOuter.width / 2) + radius * Math.sin(angle) - 36;
            // Color by role
            let bgColor = '#ffa726'; // orange default
            if (player.role === 'Bowler') bgColor = '#43a047';
            if (player.role === 'All-rounder') bgColor = '#388e3c';
            if (player.role === 'Wicketkeeper') bgColor = '#1976d2';
            if (player.role === 'Captain') bgColor = '#00695c';
            return (
              <View
                key={player.id}
                style={[
                  styles.playerAvatarRef,
                  { left: x, top: y, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }
                ]}
              >
                <View style={[styles.playerImageCircleRef, { backgroundColor: bgColor }]}> 
                  {player.profilePicture ? (
                    <Image source={{ uri: player.profilePicture }} style={styles.playerImageRef} />
                  ) : (
                    <Ionicons name="person" size={36} color="#fff" />
                  )}
                </View>
                <Text style={styles.playerNameRef} numberOfLines={1}>{player.name}</Text>
                <Text style={styles.playerRoleRef}>{player.role === 'Wicketkeeper' ? 'WK' : player.role}</Text>
              </View>
            );
          })}
        </View>
        {/* Add Player Button (Yellow) */}
        <TouchableOpacity style={styles.addPlayerButtonRef} onPress={() => setModalVisible(true)} accessibilityLabel="Add Player">
          <Ionicons name="add" size={36} color="#222" />
        </TouchableOpacity>
      </View>
      {/* Save Button */}
      <TouchableOpacity
        style={styles.saveButtonRef}
        onPress={handleSaveTeam}
        disabled={!isTeamValid() || saving}
        accessibilityLabel="Save Team"
      >
        {console.log('Save button disabled:', !isTeamValid() || saving)}
        <Text style={styles.saveButtonTextRef}>
          {saving ? 'Saving...' : 'SAVE '}
          <Text style={{ color: '#888', opacity: 0.6, fontWeight: 'bold' }}> {players.length} 🧑‍🤝‍🧑</Text>
        </Text>
      </TouchableOpacity>
      {/* Modals remain unchanged */}
      {/* Add Player Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Player</Text>
            {/* Search input */}
            <TextInput
              style={styles.modalInput}
              placeholder="Search by name"
              value={search}
              onChangeText={text => {
                setSearch(text);
                setSelectedUser(null);
              }}
              autoCapitalize="none"
              placeholderTextColor="#888"
            />
            {/* Search results */}
            {searching && <Text style={{ marginBottom: 8 }}>Searching...</Text>}
            {!selectedUser && searchResults.length > 0 && (
              <View style={{ maxHeight: 160, width: '100%', marginBottom: 10 }}>
                {searchResults.map(user => (
                  <TouchableOpacity
                    key={user.id}
                    style={{ padding: 10, borderBottomWidth: 1, borderColor: '#eee' }}
                    onPress={() => setSelectedUser(user)}
                  >
                    <Text style={{ fontWeight: 'bold' }}>{user.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {/* Selected user and role picker */}
            {selectedUser && (
              <>
                <Text style={{ marginBottom: 8, fontWeight: 'bold' }}>Selected: {selectedUser.name}</Text>
                <View style={styles.rolePickerContainer}>
                  {ROLES.map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[styles.roleOption, playerRole === role && styles.selectedRoleOption]}
                      onPress={() => setPlayerRole(role)}
                    >
                      <Text style={[styles.roleOptionText, playerRole === role && styles.selectedRoleOptionText]}>{role}</Text>
                    </TouchableOpacity>
                  ))}
          </View>
                <View style={styles.modalButtonRow}>
                  <TouchableOpacity style={styles.modalButton} onPress={() => {
                    setModalVisible(false);
                    setSelectedUser(null);
                    setSearch('');
                    setSearchResults([]);
                  }}>
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#4cd137' }]} onPress={handleAddPlayer}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Add</Text>
                  </TouchableOpacity>
            </View>
              </>
            )}
            {!selectedUser && (
              <TouchableOpacity style={[styles.modalButton, { marginTop: 10 }]} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Manage Player Modal */}
      <Modal
        visible={manageModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setManageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Player</Text>
            {selectedPlayer && (
              <>
                <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>{getInitials(selectedPlayer.id)}</Text>
                <Text style={{ marginBottom: 10 }}>Current Role: <Text style={{ fontWeight: 'bold' }}>{selectedPlayer.role}</Text></Text>
                {/* Edit Role */}
                <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Edit Role:</Text>
                <View style={styles.rolePickerContainer}>
                  {ROLES.map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[styles.roleOption, editRole === role && styles.selectedRoleOption]}
                      onPress={() => setEditRole(role)}
                    >
                      <Text style={[styles.roleOptionText, editRole === role && styles.selectedRoleOptionText]}>{role}</Text>
                    </TouchableOpacity>
                  ))}
        </View>
                <View style={styles.modalButtonRow}>
                  <TouchableOpacity style={styles.modalButton} onPress={handleRemovePlayer}>
                    <Text style={[styles.modalButtonText, { color: '#f00' }]}>Remove</Text>
      </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#4cd137' }]} onPress={handleEditRole}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save Role</Text>
      </TouchableOpacity>
    </View>
                {/* Promote to Captain */}
                {selectedPlayer.role !== 'Captain' && (
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#f77f1b', marginTop: 10 }]}
                    onPress={handlePromoteToCaptain}
                  >
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Promote to Captain</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.modalButton, { marginTop: 10 }]} onPress={() => setManageModalVisible(false)}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 16,
  },
  teamNameInput: {
    fontSize: 22,
    fontWeight: 'bold',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 18,
    alignSelf: 'center',
    color: '#222',
    elevation: 2,
  },
  groundContainer: {
    width: GROUND_SIZE,
    height: GROUND_SIZE,
    backgroundColor: '#4cd137',
    borderRadius: GROUND_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    elevation: 6,
  },
  pitch: {
    position: 'absolute',
    left: (GROUND_SIZE - PITCH_WIDTH) / 2,
    top: (GROUND_SIZE - PITCH_HEIGHT) / 2,
    width: PITCH_WIDTH,
    height: PITCH_HEIGHT,
    backgroundColor: '#f77f1b',
    borderRadius: 16,
    zIndex: 1,
    elevation: 8,
  },
  addButton: {
    position: 'absolute',
    left: (GROUND_SIZE - 60) / 2,
    top: (GROUND_SIZE - 60) / 2,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#f77f1b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 18,
    color: '#222',
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 18,
    color: '#222',
  },
  rolePickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 18,
    gap: 8,
  },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#eee',
    margin: 4,
  },
  selectedRoleOption: {
    backgroundColor: '#4cd137',
  },
  roleOptionText: {
    color: '#222',
    fontWeight: 'bold',
  },
  selectedRoleOptionText: {
    color: '#fff',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#eee',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  avatarContainer: {
    position: 'absolute',
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#4cd137',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4cd137',
  },
  captainBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#f77f1b',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 10,
  },
  captainBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  saveButton: {
    marginTop: 24,
    backgroundColor: '#4cd137',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    alignSelf: 'center',
    elevation: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 1,
  },
  teamNameInputRef: {
    fontSize: 24,
    fontWeight: '500',
    backgroundColor: '#f5f7fa',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 16,
    marginBottom: 18,
    color: '#8a98a9',
    width: '90%',
    alignSelf: 'center',
    elevation: 2,
  },
  groundWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  groundOuter: {
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: '#1b7c3a',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  groundMiddle: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#2ecc71',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groundInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#43a047',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pitchRef: {
    width: 60,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#ffe082',
    borderWidth: 2,
    borderColor: '#bfa14a',
    alignSelf: 'center',
    marginTop: 10,
  },
  playerAvatarRef: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 4,
  },
  playerRoleRef: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginTop: 2,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  addPlayerButtonRef: {
    position: 'absolute',
    bottom: -36,
    left: '50%',
    marginLeft: -36,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffe600',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10,
  },
  saveButtonRef: {
    marginTop: 60,
    backgroundColor: '#ffe600',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
    alignSelf: 'center',
    elevation: 4,
  },
  saveButtonTextRef: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 22,
    letterSpacing: 1,
  },
  playerImageCircleRef: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    overflow: 'hidden',
  },
  playerImageRef: {
    width: 52,
    height: 52,
    borderRadius: 26,
    resizeMode: 'cover',
  },
  playerNameRef: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 0,
    maxWidth: 70,
    textAlign: 'center',
  },
});
