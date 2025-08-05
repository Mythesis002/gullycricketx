import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../utils/supabaseClient';
import { authDebugger } from '../utils/auth-debugger';
import { authTroubleshooter } from '../utils/auth-troubleshooter';
import { authFallback } from '../utils/auth-fallback';

const { width } = Dimensions.get('window');

// Helper function to safely access storage
const getStorageValue = (key: string): string | null => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  return null;
};

const setStorageValue = (key: string, value: string): void => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, value);
  }
};

export default function AuthScreen() {
  const [showRegistration, setShowRegistration] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [showFallbackOptions, setShowFallbackOptions] = useState(false);
  const [recoveryStrategy, setRecoveryStrategy] = useState<any>(null);
  const ballAnimation = new Animated.Value(0);

  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<null | boolean>(null);
  const [checkingName, setCheckingName] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    // Cricket ball bouncing animation
    const bounce = () => {
      Animated.sequence([
        Animated.timing(ballAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(ballAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => bounce());
    };
    bounce();
  }, []);

  useEffect(() => {
    // Check if user profile exists after login
    if (user) {
      checkUserProfile();
    }
  }, [user]);

  // Retry countdown effect
  useEffect(() => {
    if (retryCountdown > 0) {
      const timer = setTimeout(() => {
        setRetryCountdown(retryCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [retryCountdown]);

  const normalizeName = (input: string) => {
    // Lowercase, trim, single spaces only, only a-z 0-9 and spaces
    return input
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleNameChange = (input: string) => {
    const normalized = normalizeName(input);
    setName(normalized);
    // Validation: only a-z, 0-9, single spaces, no leading/trailing/multiple spaces
    if (!/^[a-z0-9]+( [a-z0-9]+)*$/.test(normalized)) {
      setNameError('Only lowercase letters, numbers, and single spaces allowed');
    } else {
      setNameError('');
    }
  };

  useEffect(() => {
    if (!name.trim() || nameError) {
      setNameAvailable(null);
      return;
    }
    setCheckingName(true);
    const timeout = setTimeout(async () => {
      const { data: users, error } = await supabase.from('users').select('id').eq('name', name);
      if (error) {
        setNameAvailable(null);
      } else {
        setNameAvailable(!users || users.length === 0);
      }
      setCheckingName(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [name, nameError]);

  const checkUserProfile = async () => {
    try {
      console.log('🔍 Checking user profile for:', user?.email);
      const { data: users, error } = await supabase.from('users').select('*').eq('email', user?.email);
      if (error) throw error;
      if (users && users.length > 0) {
        console.log('✅ User profile found:', users[0].name);
        setUser(users[0]);
        setShowRegistration(false);
      } else {
        console.log('📝 No profile found, showing registration form');
        setShowRegistration(true);
      }
    } catch (error) {
      console.error('❌ Error checking user profile:', error);
    }
  };

  const generateJerseyNumber = () => {
    const number = Math.floor(Math.random() * 99) + 1;
    setJerseyNumber(number.toString());
  };

  const runDiagnostic = async () => {
    setShowDiagnostic(true);
    try {
      const results = await authTroubleshooter.runFullDiagnostic();
      setDiagnosticResults(results);
      console.log('🔍 Diagnostic results:', results);
      
      // Log the specific OAuth issue
      console.log('🔍 OAuth Issue:', results.oauthIssue);
      
      // Show specific OAuth solutions if it's a token exchange error
      if (results.oauthIssue.code === 'TOKEN_EXCHANGE_FAILED') {
        console.log('🔍 Specific OAuth solutions:', authTroubleshooter.getSpecificOAuthSolutions());
      }
    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
    }
  };

  const showSupportReport = () => {
    const report = authFallback.generateSupportReport();
    Alert.alert(
      'Support Report',
      'Copy this report and send it to support:',
      [
        { text: 'Copy Report', onPress: () => console.log(report) },
        { text: 'Cancel' }
      ]
    );
  };

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !jerseyNumber.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    setIsLoading(true);
    try {
      // Check if name is unique
      const { data: existingUsers, error: nameError } = await supabase.from('users').select('id').eq('name', name.trim());
      if (nameError) throw nameError;
      if (existingUsers && existingUsers.length > 0) {
        Alert.alert('Name Taken', 'This name is already taken. Please choose a unique name.');
        setIsLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) throw error;
      const user = data.user;
      if (!user) {
        Alert.alert('Check your email', 'Please confirm your email before logging in.');
        setShowRegistration(false);
        return;
      }
      // Create user profile in users table
      await supabase.from('users').insert([{
        id: user.id,
        name: name.trim(),
        email: email.trim(),
        bio: bio.trim(),
        jerseyNumber: jerseyNumber.trim(),
        profilePicture: '',
        matchesPlayed: 0,
        totalRuns: 0,
        totalWickets: 0,
        battingAverage: 0,
        strikeRate: 0,
        bowlingAverage: 0,
        economyRate: 0,
        badges: JSON.stringify([]),
        createdAt: Date.now(),
      }]);
      Alert.alert('Success', 'Account created! Please check your email to verify.');
      setShowRegistration(false);
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) throw error;
      const session = data.session;
      const user = session?.user;
      if (!user) throw new Error('No user returned from signIn');
      // Fetch user profile (use maybeSingle for safety)
      let { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (!profile) {
        // No profile exists, create one
        await supabase.from('users').insert([{
          id: user.id,
          name: '',
          email: user.email,
          bio: '',
          jerseyNumber: '',
          profilePicture: '',
          matchesPlayed: 0,
          totalRuns: 0,
          totalWickets: 0,
          battingAverage: 0,
          strikeRate: 0,
          bowlingAverage: 0,
          economyRate: 0,
          badges: JSON.stringify([]),
          createdAt: Date.now(),
        }]);
        // Fetch again
        const { data: newProfile } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
        profile = newProfile;
      }
      setUser(profile);
      setShowRegistration(false);
      Alert.alert('Login Success', 'Welcome back!');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
      setShowRegistration(true);
    } finally {
      setIsLoading(false);
    }
  };

  const ballTranslateY = ballAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -50],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Animated.View
          style={[
            styles.cricketBall,
            {
              transform: [{ translateY: ballTranslateY }],
            },
          ]}
        >
          <MaterialIcons name="sports-cricket" size={60} color="#FFD700" />
        </Animated.View>
        
        <Text style={styles.title}>GullyCricketX</Text>
        <Text style={styles.subtitle}>
          Where Every Street is a Stadium! 🏏
        </Text>
      </View>

      <View style={styles.content}>
        {!showRegistration ? (
          <View style={styles.loginSection}>
            <Text style={styles.welcomeText}>
              Join the ultimate gully cricket community
            </Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={24} color="#FFD700" />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={24} color="#FFD700" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleSignIn}
              disabled={isLoading || isRetrying}
            >
              <MaterialIcons name="login" size={24} color="#1B5E20" />
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Signing In...' : 
                 isRetrying ? `Retrying in ${retryCountdown}s...` : 
                 'Sign in'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.diagnosticButton}
              onPress={() => setShowRegistration(true)}
            >
              <MaterialIcons name="person-add" size={20} color="#FFD700" />
              <Text style={styles.diagnosticButtonText}>Register</Text>
            </TouchableOpacity>

            {loginAttempts > 0 && (
              <Text style={styles.attemptsText}>
                Attempt {loginAttempts}/3
              </Text>
            )}

            {showFallbackOptions && recoveryStrategy && (
              <View style={styles.fallbackContainer}>
                <Text style={styles.fallbackTitle}>⚠️ Authentication Issues Detected</Text>
                <Text style={styles.fallbackMessage}>{recoveryStrategy.message}</Text>
                <Text style={styles.fallbackAction}>{recoveryStrategy.action}</Text>
              </View>
            )}

            {showDiagnostic && diagnosticResults && (
              <View style={styles.diagnosticContainer}>
                <Text style={styles.diagnosticTitle}>🔍 Diagnostic Results</Text>
                {diagnosticResults.recommendations.map((rec: string, index: number) => (
                  <Text key={index} style={styles.diagnosticText}>{rec}</Text>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.diagnosticButton}
              onPress={runDiagnostic}
            >
              <MaterialIcons name="bug-report" size={20} color="#FFD700" />
              <Text style={styles.diagnosticButtonText}>Run Diagnostic</Text>
            </TouchableOpacity>

            {authFallback.shouldUseFallback() && (
              <TouchableOpacity
                style={styles.supportButton}
                onPress={showSupportReport}
              >
                <MaterialIcons name="support-agent" size={20} color="#FFD700" />
                <Text style={styles.supportButtonText}>Get Support Report</Text>
              </TouchableOpacity>
            )}

            <View style={styles.features}>
              <View style={styles.feature}>
                <MaterialIcons name="group" size={24} color="#FFD700" />
                <Text style={styles.featureText}>Create Teams</Text>
              </View>
              <View style={styles.feature}>
                <MaterialIcons name="sports-cricket" size={24} color="#FFD700" />
                <Text style={styles.featureText}>Track Matches</Text>
              </View>
              <View style={styles.feature}>
                <MaterialIcons name="leaderboard" size={24} color="#FFD700" />
                <Text style={styles.featureText}>View Stats</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.registrationSection}>
            <Text style={styles.registrationTitle}>Register Your Account</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="person" size={24} color="#FFD700" />
              <TextInput
                style={styles.input}
                placeholder="Your Name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={handleNameChange}
                maxLength={50}
                autoCapitalize="none"
              />
              {checkingName && <MaterialIcons name="hourglass-empty" size={20} color="#999" style={{ marginLeft: 8 }} />}
              {name.trim() && nameAvailable === true && !checkingName && (
                <MaterialIcons name="check-circle" size={20} color="#4CAF50" style={{ marginLeft: 8 }} />
              )}
              {name.trim() && nameAvailable === false && !checkingName && (
                <MaterialIcons name="cancel" size={20} color="#F44336" style={{ marginLeft: 8 }} />
              )}
            </View>
            {nameError ? (
              <Text style={{ color: '#F44336', marginLeft: 36, marginTop: 2 }}>{nameError}</Text>
            ) : null}
            {name.trim() && nameAvailable === true && !checkingName && (
              <Text style={{ color: '#4CAF50', marginLeft: 36, marginTop: 2 }}>Name available</Text>
            )}
            {name.trim() && nameAvailable === false && !checkingName && (
              <Text style={{ color: '#F44336', marginLeft: 36, marginTop: 2 }}>Name not available</Text>
            )}
            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={24} color="#FFD700" />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={24} color="#FFD700" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
            <View style={styles.inputContainer}>
              <MaterialIcons name="sports" size={24} color="#FFD700" />
              <TextInput
                style={styles.input}
                placeholder="Jersey Number"
                placeholderTextColor="#999"
                value={jerseyNumber}
                onChangeText={setJerseyNumber}
                keyboardType="numeric"
                maxLength={2}
              />
              <TouchableOpacity onPress={generateJerseyNumber}>
                <MaterialIcons name="shuffle" size={24} color="#FFD700" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <MaterialIcons name="edit" size={24} color="#FFD700" />
              <TextInput
                style={styles.input}
                placeholder="Bio (optional)"
                placeholderTextColor="#999"
                value={bio}
                onChangeText={setBio}
                maxLength={150}
                multiline
              />
            </View>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleSignUp}
              disabled={!nameAvailable || isLoading || !!nameError}
            >
              <Text style={styles.completeButtonText}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.diagnosticButton}
              onPress={() => setShowRegistration(false)}
            >
              <MaterialIcons name="arrow-back" size={20} color="#FFD700" />
              <Text style={styles.diagnosticButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🏏 Gully Cricket • Street Smart • Community Driven 🏏
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B5E20',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  cricketBall: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F5E8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loginSection: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    color: '#E8F5E8',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginLeft: 8,
  },
  attemptsText: {
    color: '#FFD700',
    fontSize: 12,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  fallbackContainer: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF5722',
  },
  fallbackTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  fallbackMessage: {
    fontSize: 12,
    color: '#FFF',
    marginBottom: 4,
  },
  fallbackAction: {
    fontSize: 12,
    color: '#FFF',
    fontStyle: 'italic',
  },
  diagnosticButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFD700',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 10,
  },
  diagnosticButtonText: {
    fontSize: 14,
    color: '#FFD700',
    marginLeft: 8,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF5722',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
  },
  supportButtonText: {
    fontSize: 14,
    color: '#FF5722',
    marginLeft: 8,
  },
  diagnosticContainer: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  diagnosticTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  diagnosticText: {
    fontSize: 12,
    color: '#E8F5E8',
    marginBottom: 4,
    lineHeight: 16,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    color: '#E8F5E8',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  registrationSection: {
    paddingTop: 20,
  },
  registrationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  input: {
    flex: 1,
    color: '#E8F5E8',
    fontSize: 16,
    marginLeft: 12,
  },
  completeButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  footer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#E8F5E8',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
