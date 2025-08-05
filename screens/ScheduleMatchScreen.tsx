import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet, ActivityIndicator, TextInput, Alert, Modal, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../utils/supabaseClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

// App color scheme (matching existing app theme)
const COLORS = {
  primary: '#2E7D32',
  secondary: '#FFD700',
  accent: '#4cd137',
  background: '#E8F5E8',
  surface: '#FFFFFF',
  text: '#1B5E20',
  textSecondary: '#666',
  border: '#4CAF50',
  error: '#F44336',
  success: '#4CAF50',
  warning: '#FF9800',
};

export default function ScheduleMatchScreen() {
  const navigation = useNavigation();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [step, setStep] = useState(1);
  const [selectedMyTeam, setSelectedMyTeam] = useState(null);
  const [opponentSearch, setOpponentSearch] = useState('');
  const [opponentResults, setOpponentResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [matchTitle, setMatchTitle] = useState('');
  const [matchType, setMatchType] = useState('Single');
  const [overs, setOvers] = useState('10');
  const [customOvers, setCustomOvers] = useState('');
  const [ballType, setBallType] = useState('Tennis');
  const [playType, setPlayType] = useState('Play Now');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [showTeamDetails, setShowTeamDetails] = useState(false);
  const [teamToShow, setTeamToShow] = useState(null);
  const [teamSelectType, setTeamSelectType] = useState<'my' | 'opponent' | null>(null);
  const [matchMode, setMatchMode] = useState(null);
  const [errors, setErrors] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const playersArr = useMemo(() => {
    if (!teamToShow) return [];
    let arr = teamToShow.players;
    if (typeof arr === 'string') {
      try {
        arr = JSON.parse(arr);
      } catch {
        arr = [];
      }
    }
    return Array.isArray(arr) ? arr : [];
  }, [teamToShow]);

  // Reset errors when form changes
  useEffect(() => {
    setErrors({});
  }, [matchTitle, customOvers, scheduledDate]);

  // Validate form data
  const validateForm = () => {
    const newErrors = {};
    
    if (overs === 'Custom' && (!customOvers || isNaN(Number(customOvers)) || Number(customOvers) <= 0)) {
      newErrors.customOvers = 'Please enter a valid number of overs';
    }
    
    if (playType === 'Schedule' && scheduledDate <= new Date()) {
      newErrors.scheduledDate = 'Scheduled date must be in the future';
    }
    
    if (matchTitle && matchTitle.length > 50) {
      newErrors.matchTitle = 'Match title must be less than 50 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Auto-save form data to prevent loss
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Save form state to AsyncStorage or similar if needed
      };
    }, [])
  );

  // Prevent accidental navigation away
  const handleBackPress = () => {
    if (step > 1 || selectedMyTeam || selectedOpponent || matchTitle || customOvers) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        setUserId(uid);
        
        if (!uid) {
          setTeams([]);
          return;
        }

        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .eq('is_deleted', false);

        if (error) throw error;

        const myTeams = (data || []).filter(team => {
          // Additional safety check for deleted teams
          if (team.is_deleted) return false;
          
          if (team.created_by === uid) return true;
          
          let playersArr = team.players;
          if (typeof playersArr === 'string') {
            try {
              playersArr = JSON.parse(playersArr);
            } catch {
              playersArr = [];
            }
          }
          
          if (Array.isArray(playersArr)) {
            return playersArr.some(p => p.id === uid);
          }
          return false;
        });

        setTeams(myTeams);
      } catch (error) {
        console.error('Error fetching teams:', error);
        Alert.alert('Error', 'Failed to load teams. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeams();
  }, []);

  useEffect(() => {
    if (step !== 2) {
      setOpponentResults([]);
      return;
    }
    
    setSearching(true);
    const fetchOpponents = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const myId = session?.user?.id;
        let followerIds = [];
        
        if (myId) {
          const { data: followersData, error: followersError } = await supabase
            .from('followers')
            .select('follower_id')
            .eq('following_id', myId);
            
          if (followersError) throw followersError;
          followerIds = (followersData || []).map(f => String(f.follower_id));
        }

        let teamsQuery = supabase
          .from('teams')
          .select('*')
          .in('created_by', followerIds)
          .eq('is_deleted', false);
          
        if (opponentSearch.trim()) {
          teamsQuery = teamsQuery.ilike('name', `%${opponentSearch.trim()}%`);
        }
        
        const { data, error } = await teamsQuery;
        if (error) throw error;
        
        const filtered = (data || []).filter(t => {
          // Additional safety check for deleted teams
          if (t.is_deleted) return false;
          return t.id !== selectedMyTeam?.id;
        });
        setOpponentResults(filtered);
      } catch (error) {
        console.error('Error fetching opponents:', error);
        Alert.alert('Error', 'Failed to search opponents. Please try again.');
        setOpponentResults([]);
      } finally {
        setSearching(false);
      }
    };
    
    const timeoutId = setTimeout(fetchOpponents, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [opponentSearch, step, selectedMyTeam]);

  const renderTeam = ({ item }) => {
    let playersArr = item.players;
    if (typeof playersArr === 'string') {
      try {
        playersArr = JSON.parse(playersArr);
      } catch {
        playersArr = [];
      }
    }
    
    return (
      <TouchableOpacity
        style={styles.teamCard}
        onPress={() => {
          setTeamToShow(item);
          setTeamSelectType('my');
          setShowTeamDetails(true);
        }}
      >
        {item.logo_url ? (
          <Image source={{ uri: item.logo_url }} style={styles.teamLogo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Ionicons name="people" size={24} color={COLORS.textSecondary} />
          </View>
        )}
        <Text style={styles.teamName}>{item.name}</Text>
        <Text style={styles.playerCount}>{playersArr.length || 0} Players</Text>
      </TouchableOpacity>
    );
  };

  const renderOpponent = ({ item }) => {
    let playersArr = item.players;
    if (typeof playersArr === 'string') {
      try {
        playersArr = JSON.parse(playersArr);
      } catch {
        playersArr = [];
      }
    }
    
    return (
      <TouchableOpacity
        style={styles.teamCard}
        onPress={() => {
          setTeamToShow(item);
          setTeamSelectType('opponent');
          setShowTeamDetails(true);
        }}
      >
        {item.logo_url ? (
          <Image source={{ uri: item.logo_url }} style={styles.teamLogo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Ionicons name="people" size={24} color={COLORS.textSecondary} />
          </View>
        )}
        <Text style={styles.teamName}>{item.name}</Text>
        <Text style={styles.playerCount}>{playersArr.length || 0} Players</Text>
      </TouchableOpacity>
    );
  };

  const handleSendRequest = async () => {
    if (!validateForm()) {
      Alert.alert(
        'Validation Error', 
        'Please fix the errors before continuing.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const senderTeamId = String(selectedMyTeam.id);
      const receiverTeamId = String(selectedOpponent.id);
      const opponentTeamCreatorId = String(selectedOpponent.created_by);

      const scheduledAtValue = new Date(scheduledDate).toISOString();
      const payload = {
        sender_team_id: senderTeamId,
        receiver_team_id: receiverTeamId,
        created_by: userId,
        receiver_user_id: opponentTeamCreatorId,
        match_title: matchTitle,
        match_type: matchType.toLowerCase(),
        overs: Number(overs === 'Custom' ? customOvers : overs),
        ball_type: ballType.toLowerCase(),
        scheduled_at: scheduledAtValue,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const { data: reqData, error: reqError } = await supabase
        .from('match_requests')
        .insert([payload])
        .select();
        
      if (reqError) throw reqError;
      
      const matchRequestId = reqData && reqData[0]?.id;

      // Send notification
      const notificationPayload = {
        userid: opponentTeamCreatorId,
        title: 'Match Request',
        message: `You have received a match request for your team '${selectedOpponent.name}'. Tap to review and accept.`,
        type: 'match_request',
        read: false,
        created_at: new Date().toISOString(),
        match_request_id: matchRequestId,
      };

      const { error: notifError } = await supabase
        .from('notifications')
        .insert([notificationPayload]);
        
      if (notifError) {
        console.log('Notification error:', notifError);
      }

      setSending(false);
      navigation.navigate('WaitingForApprovalScreen', {
        matchRequestId,
        matchDetails: {
          myTeamName: selectedMyTeam.name,
          opponentTeamName: selectedOpponent.name,
          matchType,
          overs: overs === 'Custom' ? customOvers : overs,
          ballType,
          scheduledAt: scheduledAtValue,
        }
      });
    } catch (err) {
      setSending(false);
      Alert.alert('Error', err.message || 'Failed to send match request. Please try again.');
    }
  };

  const renderStepIndicator = () => {
    const steps = ['Select Team', 'Choose Opponent', 'Match Details'];
    return (
      <View style={styles.stepIndicator}>
        {steps.map((stepName, index) => (
          <View key={index} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              step > index + 1 ? styles.stepCompleted : 
              step === index + 1 ? styles.stepActive : styles.stepInactive
            ]}>
              {step > index + 1 ? (
                <Ionicons name="checkmark" size={16} color={COLORS.surface} />
              ) : (
                <Text style={styles.stepNumber}>{index + 1}</Text>
              )}
            </View>
            <Text style={[
              styles.stepText,
              step >= index + 1 ? styles.stepTextActive : styles.stepTextInactive
            ]}>
              {stepName}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading teams...</Text>
      </View>
    );
  }

  if (!matchMode) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        <View style={styles.modeSelectionContent}>
          <Text style={styles.modeSelectionTitle}>Select Match Type</Text>
          <Text style={styles.modeSelectionSubtitle}>Choose how you want to organize your cricket match</Text>
          
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setMatchMode('single')}
          >
            <Ionicons name="game-controller" size={32} color={COLORS.surface} />
            <Text style={styles.modeButtonText}>Single Match / Series</Text>
            <Text style={styles.modeButtonSubtext}>Quick match setup with one opponent</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.modeButton, styles.tournamentButton]}
            onPress={() => {
              setMatchMode('tournament');
              navigation.navigate('TournamentWizard');
            }}
          >
            <Ionicons name="trophy" size={32} color={COLORS.surface} />
            <Text style={styles.modeButtonText}>Tournament</Text>
            <Text style={styles.modeButtonSubtext}>Organize multiple teams in a tournament</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (matchMode !== 'single') return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Team Details Modal */}
      <Modal 
        visible={showTeamDetails && !!teamToShow && (teamSelectType === 'my' || teamSelectType === 'opponent')} 
        animationType="slide" 
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {teamToShow?.logo_url ? (
                <Image source={{ uri: teamToShow.logo_url }} style={styles.modalTeamLogo} />
              ) : (
                <View style={styles.modalTeamLogoPlaceholder}>
                  <Ionicons name="people" size={32} color={COLORS.textSecondary} />
                </View>
              )}
              <Text style={styles.modalTeamName}>{teamToShow?.name}</Text>
              {teamToShow?.description && (
                <Text style={styles.modalTeamDescription}>{teamToShow.description}</Text>
              )}
              <Text style={styles.modalSectionTitle}>Players ({playersArr.length})</Text>
              {playersArr.length === 0 ? (
                <Text style={styles.modalNoPlayers}>No players found.</Text>
              ) : (
                playersArr.map((p, idx) => (
                  <View key={p.id || idx} style={styles.modalPlayerItem}>
                    <Text style={styles.modalPlayerName}>{p.name}</Text>
                    <Text style={styles.modalPlayerRole}>{p.role}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowTeamDetails(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalContinueButton}
                onPress={() => {
                  setShowTeamDetails(false);
                  if (teamSelectType === 'my') {
                    setSelectedMyTeam(teamToShow);
                    setStep(2);
                  } else if (teamSelectType === 'opponent') {
                    setSelectedOpponent(teamToShow);
                    setStep(3);
                  }
                }}
              >
                <Text style={styles.modalContinueButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Main Content */}
      <View style={styles.content}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backToPreviousButton}
            onPress={() => setStep(step - 1)}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
            <Text style={styles.backToPreviousText}>Back to Previous Step</Text>
          </TouchableOpacity>
        )}
        {step === 1 && (
          teams.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyStateTitle}>No Teams Found</Text>
              <Text style={styles.emptyStateSubtitle}>You need to create a team before scheduling matches</Text>
              <TouchableOpacity 
                style={styles.createTeamButton}
                onPress={() => navigation.navigate('TeamDetailsScreen')}
              >
                <Text style={styles.createTeamButtonText}>Create Team</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Select Your Team</Text>
              <Text style={styles.stepSubtitle}>Choose the team you'll be playing with</Text>
              <FlatList
                data={teams}
                renderItem={renderTeam}
                keyExtractor={item => item.id}
                numColumns={2}
                contentContainerStyle={styles.grid}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select Opponent Team</Text>
            <Text style={styles.stepSubtitle}>Search and choose your opponent team</Text>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search opponent team by name..."
                value={opponentSearch}
                onChangeText={setOpponentSearch}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            
            {searching && (
              <View style={styles.searchingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.searchingText}>Searching...</Text>
              </View>
            )}
            
            <FlatList
              data={opponentResults}
              renderItem={renderOpponent}
              keyExtractor={item => item.id}
              numColumns={2}
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                opponentSearch.trim() && !searching ? (
                  <View style={styles.emptySearch}>
                    <Ionicons name="search-outline" size={48} color={COLORS.textSecondary} />
                    <Text style={styles.emptySearchText}>No teams found</Text>
                    <Text style={styles.emptySearchSubtext}>Try a different search term</Text>
                  </View>
                ) : null
              }
            />
            
            <TouchableOpacity
              style={[styles.nextButton, !selectedOpponent && styles.nextButtonDisabled]}
              onPress={() => setStep(3)}
              disabled={!selectedOpponent}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.surface} />
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Match Details</Text>
            <Text style={styles.stepSubtitle}>Configure your match settings</Text>
            
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Basic Information</Text>
              <TextInput
                style={[styles.input, errors.matchTitle && styles.inputError]}
                placeholder="Match Title (optional)"
                value={matchTitle}
                onChangeText={setMatchTitle}
                placeholderTextColor={COLORS.textSecondary}
                returnKeyType="next"
                blurOnSubmit={false}
              />
              {errors.matchTitle && (
                <Text style={styles.errorText}>{errors.matchTitle}</Text>
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Match Type</Text>
              <View style={styles.pickerRow}>
                {['Single', 'Series', 'Tournament', 'League'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.pickerOption, matchType === type && styles.selectedPickerOption]}
                    onPress={() => setMatchType(type)}
                  >
                    <Text style={[styles.pickerOptionText, matchType === type && styles.selectedPickerOptionText]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Overs</Text>
              <View style={styles.pickerRow}>
                {['5', '10', '20', 'Custom'].map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.pickerOption, overs === opt && styles.selectedPickerOption]}
                    onPress={() => setOvers(opt)}
                  >
                    <Text style={[styles.pickerOptionText, overs === opt && styles.selectedPickerOptionText]}>
                      {opt === 'Custom' ? 'Custom' : `${opt} Overs`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {overs === 'Custom' && (
                <View>
                  <TextInput
                    style={[styles.input, errors.customOvers && styles.inputError]}
                    placeholder="Enter number of overs"
                    value={customOvers}
                    onChangeText={setCustomOvers}
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.textSecondary}
                    returnKeyType="done"
                    maxLength={3}
                  />
                  {errors.customOvers && (
                    <Text style={styles.errorText}>{errors.customOvers}</Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Ball Type</Text>
              <View style={styles.pickerRow}>
                {['Tennis', 'Leather'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.pickerOption, ballType === type && styles.selectedPickerOption]}
                    onPress={() => setBallType(type)}
                  >
                    <Text style={[styles.pickerOptionText, ballType === type && styles.selectedPickerOptionText]}>
                      {type} Ball
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Schedule</Text>
              <View style={styles.pickerRow}>
                {['Play Now', 'Schedule'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.pickerOption, playType === type && styles.selectedPickerOption]}
                    onPress={() => setPlayType(type)}
                  >
                    <Text style={[styles.pickerOptionText, playType === type && styles.selectedPickerOptionText]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {playType === 'Schedule' && (
                <View>
                  <TouchableOpacity
                    style={[styles.input, errors.scheduledDate && styles.inputError]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.dateInputText}>
                      {scheduledDate ? scheduledDate.toLocaleString() : 'Pick Date & Time'}
                    </Text>
                    <Ionicons name="calendar" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  {errors.scheduledDate && (
                    <Text style={styles.errorText}>{errors.scheduledDate}</Text>
                  )}
                </View>
              )}
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={scheduledDate}
                mode="datetime"
                display="default"
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) setScheduledDate(date);
                }}
              />
            )}

            <TouchableOpacity
              style={[styles.nextButton, styles.sendRequestButton]}
              onPress={() => setShowConfirmModal(true)}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={COLORS.surface} />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>Send Request</Text>
                  <Ionicons name="send" size={20} color={COLORS.surface} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>Confirm Match Request</Text>
            <Text style={styles.confirmModalSubtitle}>Please review the details before sending</Text>
            
            <View style={styles.confirmDetails}>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Your Team:</Text>
                <Text style={styles.confirmDetailValue}>{selectedMyTeam?.name}</Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Opponent:</Text>
                <Text style={styles.confirmDetailValue}>{selectedOpponent?.name}</Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Match Type:</Text>
                <Text style={styles.confirmDetailValue}>{matchType}</Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Overs:</Text>
                <Text style={styles.confirmDetailValue}>{overs === 'Custom' ? customOvers : overs}</Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Ball Type:</Text>
                <Text style={styles.confirmDetailValue}>{ballType}</Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Schedule:</Text>
                <Text style={styles.confirmDetailValue}>{playType}</Text>
              </View>
              {playType === 'Schedule' && (
                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmDetailLabel}>Date & Time:</Text>
                  <Text style={styles.confirmDetailValue}>{scheduledDate.toLocaleString()}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.confirmCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmSendButton}
                onPress={() => {
                  setShowConfirmModal(false);
                  handleSendRequest();
                }}
              >
                <Text style={styles.confirmSendButtonText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  modeSelectionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modeSelectionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  modeSelectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modeSelectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
  },
  modeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
    maxWidth: 280,
    elevation: 2,
  },
  tournamentButton: {
    backgroundColor: COLORS.secondary,
  },
  modeButtonText: {
    color: COLORS.surface,
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 6,
  },
  modeButtonSubtext: {
    color: COLORS.surface,
    fontSize: 12,
    marginTop: 2,
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepActive: {
    backgroundColor: COLORS.primary,
  },
  stepCompleted: {
    backgroundColor: COLORS.success,
  },
  stepInactive: {
    backgroundColor: COLORS.border,
  },
  stepNumber: {
    color: COLORS.surface,
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepText: {
    fontSize: 12,
    textAlign: 'center',
  },
  stepTextActive: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  stepTextInactive: {
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  createTeamButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
  },
  createTeamButtonText: {
    color: COLORS.surface,
    fontWeight: 'bold',
    fontSize: 16,
  },
  grid: {
    paddingBottom: 24,
  },
  teamCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    margin: 6,
    alignItems: 'center',
    padding: 16,
    elevation: 1,
    minWidth: 140,
    maxWidth: '48%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  teamLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.border,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  playerCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingHorizontal: 48,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  searchingText: {
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptySearchText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySearchSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 16,
    elevation: 1,
  },
  nextButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  sendRequestButton: {
    backgroundColor: COLORS.success,
  },
  nextButtonText: {
    color: COLORS.surface,
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 6,
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pickerOption: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 70,
    alignItems: 'center',
  },
  selectedPickerOption: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pickerOptionText: {
    color: COLORS.text,
    fontWeight: '500',
    fontSize: 12,
  },
  selectedPickerOptionText: {
    color: COLORS.surface,
  },
  dateInputText: {
    color: COLORS.text,
    fontSize: 16,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTeamLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTeamLogoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTeamName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalTeamDescription: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalSectionTitle: {
    fontWeight: 'bold',
    color: COLORS.primary,
    fontSize: 18,
    marginBottom: 12,
  },
  modalNoPlayers: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalPlayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalPlayerName: {
    fontWeight: 'bold',
    color: COLORS.text,
    fontSize: 16,
  },
  modalPlayerRole: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  modalCancelButtonText: {
    color: COLORS.error,
    fontWeight: 'bold',
  },
  modalContinueButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  modalContinueButtonText: {
    color: COLORS.surface,
    fontWeight: 'bold',
  },
  confirmModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmModalSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmDetails: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  confirmDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  confirmDetailLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  confirmDetailValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  confirmModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  confirmCancelButtonText: {
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  confirmSendButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmSendButtonText: {
    color: COLORS.surface,
    fontWeight: 'bold',
  },
  backToPreviousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  backToPreviousText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
}); 