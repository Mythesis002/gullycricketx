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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const { login, isLoading, db, user } = useBasic();
  const [showRegistration, setShowRegistration] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const ballAnimation = new Animated.Value(0);

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
    if (user && db) {
      checkUserProfile();
    }
  }, [user, db]);

  const checkUserProfile = async () => {
    try {
      const users = await db?.from('users').getAll();
      const userProfile = users?.find(u => u.email === user?.email);
      
      if (!userProfile) {
        setShowRegistration(true);
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
    }
  };

  const generateJerseyNumber = () => {
    const number = Math.floor(Math.random() * 99) + 1;
    setJerseyNumber(number.toString());
  };

  const handleLogin = async () => {
    try {
      await login();
      // After successful login, check if user profile exists
      // If not, show registration form
    } catch (error) {
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    }
  };

  const handleCompleteRegistration = async () => {
    if (!name.trim() || !jerseyNumber.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      // Create user profile in database
      const userData = {
        name: name.trim(),
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
      };

      await db?.from('users').add(userData);
      Alert.alert('Success', 'Profile created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create profile. Please try again.');
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
            
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <MaterialIcons name="login" size={24} color="#1B5E20" />
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Signing In...' : 'Sign in with Kiki Auth'}
              </Text>
            </TouchableOpacity>

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
            <Text style={styles.registrationTitle}>Complete Your Profile</Text>
            
            <View style={styles.inputContainer}>
              <MaterialIcons name="person" size={24} color="#FFD700" />
              <TextInput
                style={styles.input}
                placeholder="Your Name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                maxLength={50}
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
              onPress={handleCompleteRegistration}
            >
              <Text style={styles.completeButtonText}>Complete Registration</Text>
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
    marginBottom: 40,
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
