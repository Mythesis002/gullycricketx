import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';
import { useNavigation } from '@react-navigation/native';

export default function EditProfileScreen() {
  const { db, user } = useBasic();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [bio, setBio] = useState('');
  const [originalProfile, setOriginalProfile] = useState<any>(null);

  useEffect(() => {
    fetchCurrentProfile();
  }, []);

  const fetchCurrentProfile = async () => {
    try {
      const users = await db?.from('users').getAll();
      const userProfile = (users as any[])?.find(u => u.email === user?.email);
      
      if (userProfile) {
        setOriginalProfile(userProfile);
        setName(userProfile.name || '');
        setJerseyNumber(userProfile.jerseyNumber || '');
        setBio(userProfile.bio || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return false;
    }

    if (!jerseyNumber.trim()) {
      Alert.alert('Validation Error', 'Jersey number is required');
      return false;
    }

    if (jerseyNumber.length > 3) {
      Alert.alert('Validation Error', 'Jersey number should be 3 digits or less');
      return false;
    }

    if (!/^\d+$/.test(jerseyNumber)) {
      Alert.alert('Validation Error', 'Jersey number should contain only numbers');
      return false;
    }

    if (bio.length > 150) {
      Alert.alert('Validation Error', 'Bio should be 150 characters or less');
      return false;
    }

    return true;
  };

  const checkJerseyNumberAvailability = async (newJerseyNumber: string) => {
    if (newJerseyNumber === originalProfile?.jerseyNumber) {
      return true; // Same as current, no need to check
    }

    try {
      const users = await db?.from('users').getAll();
      const existingUser = (users as any[])?.find(
        u => u.jerseyNumber === newJerseyNumber && u.id !== originalProfile?.id
      );
      
      return !existingUser;
    } catch (error) {
      console.error('Error checking jersey number:', error);
      return false;
    }
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      // Check if jersey number is available
      const isJerseyAvailable = await checkJerseyNumberAvailability(jerseyNumber);
      if (!isJerseyAvailable) {
        Alert.alert('Error', 'Jersey number is already taken by another player');
        setSaving(false);
        return;
      }

      // Update profile
      const updatedProfile = {
        ...originalProfile,
        name: name.trim(),
        jerseyNumber: jerseyNumber.trim(),
        bio: bio.trim(),
      };

      await db?.from('users').update(originalProfile.id, updatedProfile);

      Alert.alert(
        'Success! 🎉',
        'Your profile has been updated successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return (
      name.trim() !== (originalProfile?.name || '') ||
      jerseyNumber.trim() !== (originalProfile?.jerseyNumber || '') ||
      bio.trim() !== (originalProfile?.bio || '')
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="edit" size={60} color="#FFD700" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons name="edit" size={24} color="#FFD700" />
            <Text style={styles.headerTitle}>Edit Your Profile</Text>
          </View>

          {/* Profile Form */}
          <View style={styles.formSection}>
            {/* Name Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Player Name *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={20} color="#FFD700" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                  maxLength={50}
                />
              </View>
              <Text style={styles.fieldHint}>This is how other players will see you</Text>
            </View>

            {/* Jersey Number Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Jersey Number *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="sports" size={20} color="#FFD700" />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 7, 10, 99"
                  placeholderTextColor="#999"
                  value={jerseyNumber}
                  onChangeText={setJerseyNumber}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
              <Text style={styles.fieldHint}>Choose a unique number (1-999)</Text>
            </View>

            {/* Bio Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Bio</Text>
              <View style={[styles.inputContainer, styles.bioContainer]}>
                <MaterialIcons name="description" size={20} color="#FFD700" />
                <TextInput
                  style={[styles.textInput, styles.bioInput]}
                  placeholder="Tell others about your cricket journey..."
                  placeholderTextColor="#999"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={3}
                  maxLength={150}
                />
              </View>
              <Text style={styles.fieldHint}>
                {bio.length}/150 characters - Share your cricket passion!
              </Text>
            </View>
          </View>

          {/* Current Stats Preview */}
          <View style={styles.statsPreview}>
            <Text style={styles.statsTitle}>📊 Your Cricket Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{originalProfile?.matchesPlayed || 0}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{originalProfile?.totalRuns || 0}</Text>
                <Text style={styles.statLabel}>Runs</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{originalProfile?.totalWickets || 0}</Text>
                <Text style={styles.statLabel}>Wickets</Text>
              </View>
            </View>
            <Text style={styles.statsNote}>
              Stats are updated automatically after each match
            </Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { opacity: (!hasChanges() || saving) ? 0.5 : 1 }
            ]}
            onPress={handleSaveProfile}
            disabled={!hasChanges() || saving}
          >
            <MaterialIcons 
              name={saving ? "hourglass-empty" : "save"} 
              size={24} 
              color="#1B5E20" 
            />
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Profile Tips:</Text>
            <Text style={styles.tipText}>• Choose a memorable jersey number</Text>
            <Text style={styles.tipText}>• Keep your bio engaging and cricket-focused</Text>
            <Text style={styles.tipText}>• Your name will appear on team rosters</Text>
            <Text style={styles.tipText}>• Profile changes are visible immediately</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 12,
  },
  formSection: {
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  bioContainer: {
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  bioInput: {
    textAlignVertical: 'top',
    minHeight: 60,
  },
  fieldHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  statsPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statsNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginLeft: 8,
  },
  tipsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
});