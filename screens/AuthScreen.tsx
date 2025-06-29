import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  LinearGradient,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';

export default function AuthScreen() {
  const { login, isLoading, error } = useBasic();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Clear any previous auth errors when component mounts
    setAuthError(null);
  }, []);

  const handleLogin = async () => {
    try {
      setAuthError(null);
      await login();
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific error types
      if (error?.message?.includes('Failed to refresh token')) {
        setAuthError('Authentication service is temporarily unavailable. Please try again.');
      } else if (error?.message?.includes('Network')) {
        setAuthError('Network error. Please check your internet connection.');
      } else {
        setAuthError('Login failed. Please try again.');
      }
    }
  };

  const retryLogin = () => {
    setAuthError(null);
    handleLogin();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1B5E20', '#2E7D32', '#4CAF50']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <MaterialIcons name="sports-cricket" size={80} color="#FFD700" />
            </View>
            <Text style={styles.appTitle}>GullyCricketX</Text>
            <Text style={styles.appSubtitle}>
              Your Ultimate Cricket Companion
            </Text>
          </View>

          {/* Features Section */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>What you can do:</Text>
            
            <View style={styles.featureItem}>
              <MaterialIcons name="group" size={24} color="#FFD700" />
              <Text style={styles.featureText}>Create and manage cricket teams</Text>
            </View>
            
            <View style={styles.featureItem}>
              <MaterialIcons name="sports-cricket" size={24} color="#FFD700" />
              <Text style={styles.featureText}>Schedule and track matches</Text>
            </View>
            
            <View style={styles.featureItem}>
              <MaterialIcons name="bar-chart" size={24} color="#FFD700" />
              <Text style={styles.featureText}>Analyze your cricket statistics</Text>
            </View>
            
            <View style={styles.featureItem}>
              <MaterialIcons name="share" size={24} color="#FFD700" />
              <Text style={styles.featureText}>Share cricket moments with friends</Text>
            </View>
          </View>

          {/* Auth Section */}
          <View style={styles.authSection}>
            {authError && (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={20} color="#FF5722" />
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.loginButton,
                (isLoading || authError) && styles.loginButtonDisabled
              ]}
              onPress={authError ? retryLogin : handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#1B5E20" />
              ) : (
                <>
                  <MaterialIcons 
                    name={authError ? "refresh" : "login"} 
                    size={20} 
                    color="#1B5E20" 
                  />
                  <Text style={styles.loginButtonText}>
                    {authError ? 'Retry Login' : 'Sign in with Kiki Auth'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.authNote}>
              Secure authentication powered by Kiki Auth
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Join the cricket community today! 🏏
            </Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 16,
    color: '#E8F5E8',
    textAlign: 'center',
    opacity: 0.9,
  },
  featuresSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
    marginVertical: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  authSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
    borderWidth: 1,
    borderColor: '#FF5722',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#FF5722',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginLeft: 8,
  },
  authNote: {
    fontSize: 12,
    color: '#E8F5E8',
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.8,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#E8F5E8',
    textAlign: 'center',
    opacity: 0.9,
  },
});
