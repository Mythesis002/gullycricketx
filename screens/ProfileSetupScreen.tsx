import React, { useState } from 'react';
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

export default function ProfileSetupScreen() {
  const { db, user } = useBasic();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [bio, setBio] = useState('');

  const validateStep1 = () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter your name');
      return false;
    }
    return true;
  };

  const validateStep2 = async () => {
    if (!jerseyNumber.trim()) {
      Alert.alert('Required Field', 'Please enter a jersey number');
      return false;
    }

    if (!/^\d+$/.test(jerseyNumber)) {
      Alert.alert('Invalid Format', 'Jersey number should contain only numbers');
      return false;
    }

    if (jerseyNumber.length > 3) {
      Alert.alert('Invalid Format', 'Jersey number should be 3 digits or less');
      return false;
    }

    // Check if jersey number is available
    try {
      const users = await db?.from('users').getAll();
      const existingUser = (users as any[])?.find(u => u.jerseyNumber === jerseyNumber);
      
      if (existingUser) {
        Alert.alert('Number Taken', 'This jersey number is already taken. Please choose another.');
        return false;
      }
    } catch (error) {
      console.error('Error checking jersey number:', error);
      Alert.alert('Error', 'Failed to verify jersey number. Please try again.');
      return false;
    }

    return true;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      if (await validateStep2()) {
        setCurrentStep(3);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);

    try {
      const profileData = {
        name: name.trim(),
        email: user?.email || '',
        jerseyNumber: jerseyNumber.trim(),
        bio: bio.trim(),
        profilePicture: '',
        matchesPlayed: 0,
        totalRuns: 0,
        totalWickets: 0,
        battingAverage: 0,
        strikeRate: 0,
        bowlingAverage: 0,
        economyRate: 0,
        badges: '[]',
        createdAt: Date.now(),
      };

      await db?.from('users').add(profileData);

      Alert.alert(
        'Welcome to GullyCricketX! 🎉',
        'Your profile has been created successfully. Let us start playing cricket!',
        [{ text: 'Let us Go!', onPress: () => {} }]
      );
    } catch (error) {
      console.error('Error creating profile:', error);
      Alert.alert('Error', 'Failed to create profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <MaterialIcons name="person" size={60} color="#FFD700" />
        <Text style={styles.stepTitle}>What is your name?</Text>
        <Text style={styles.stepSubtitle}>
          This is how other players will know you on the field
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <MaterialIcons name="person" size={20} color="#FFD700" />
        <TextInput
          style={styles.textInput}
          placeholder="Enter your full name"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          maxLength={50}
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.nextButton, { opacity: !name.trim() ? 0.5 : 1 }]}
        onPress={handleNext}
        disabled={!name.trim()}
      >
        <Text style={styles.nextButtonText}>Next</Text>
        <MaterialIcons name="arrow-forward" size={20} color="#1B5E20" />
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <MaterialIcons name="sports" size={60} color="#FFD700" />
        <Text style={styles.stepTitle}>Choose your jersey number</Text>
        <Text style={styles.stepSubtitle}>
          Pick a unique number that represents you (1-999)
        </Text>
      </View>

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
          autoFocus
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextButton, { opacity: !jerseyNumber.trim() ? 0.5 : 1 }]}
          onPress={handleNext}
          disabled={!jerseyNumber.trim()}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#1B5E20" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <MaterialIcons name="description" size={60} color="#FFD700" />
        <Text style={styles.stepTitle}>Tell us about yourself</Text>
        <Text style={styles.stepSubtitle}>
          Share your cricket passion (optional)
        </Text>
      </View>

      <View style={[styles.inputContainer, styles.bioContainer]}>
        <MaterialIcons name="description" size={20} color="#FFD700" />
        <TextInput
          style={[styles.textInput, styles.bioInput]}
          placeholder="I love cricket because..."
          placeholderTextColor="#999"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          maxLength={150}
          autoFocus
        />
      </View>
      
      <Text style={styles.characterCount}>{bio.length}/150 characters</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.completeButton, { opacity: saving ? 0.5 : 1 }]}
          onPress={handleComplete}
          disabled={saving}
        >
          <Text style={styles.completeButtonText}>
            {saving ? 'Creating...' : 'Complete Setup'}
          </Text>
          <MaterialIcons 
            name={saving ? "hourglass-empty" : "check"} 
            size={20} 
            color="#1B5E20" 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Debug Info */}
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              👤 User: {user?.email || 'No user'}
            </Text>
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={() => {
                Alert.alert(
                  'Debug Info',
                  `User: ${user?.email}\nStep: ${currentStep}\nName: ${name}\nJersey: ${jerseyNumber}`,
                  [{ text: 'OK' }]
                );
              }}
            >
              <Text style={styles.debugButtonText}>Debug Info</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Step {currentStep} of 3</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(currentStep / 3) * 100}%` }]} />
            </View>
          </View>

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>🏏 Welcome to GullyCricketX!</Text>
            <Text style={styles.welcomeText}>
              Join the ultimate cricket community where every match matters and every player shines!
            </Text>
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
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  stepContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
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
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginBottom: 16,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginRight: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  welcomeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  debugContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  debugText: {
    fontSize: 12,
    color: '#E65100',
    marginBottom: 8,
  },
  debugButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
