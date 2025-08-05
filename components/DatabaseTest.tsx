import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../utils/supabaseClient';

export default function DatabaseTest() {
  const [testResult, setTestResult] = useState<string>('');

  const testUserQuery = async () => {
    try {
      console.log('🧪 Testing user query...');
      
      // Test 1: Get current user
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        setTestResult('No authenticated user found');
        return;
      }

      console.log('👤 Current user ID:', userId);

      // Test 2: Query user with quotes
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, "profilePicture", "jerseyNumber"')
        .eq('id', userId)
        .single();

      console.log('👤 User data with quotes:', userData);
      console.log('👤 User error with quotes:', userError);

      // Test 3: Query user without quotes
      const { data: userData2, error: userError2 } = await supabase
        .from('users')
        .select('id, name, profilePicture, jerseyNumber')
        .eq('id', userId)
        .single();

      console.log('👤 User data without quotes:', userData2);
      console.log('👤 User error without quotes:', userError2);

      // Test 4: Query all users
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('*')
        .limit(3);

      console.log('👥 All users sample:', allUsers);
      console.log('👥 All users error:', allUsersError);

      setTestResult(JSON.stringify({
        userId,
        userWithQuotes: userData,
        userWithoutQuotes: userData2,
        allUsersSample: allUsers
      }, null, 2));

    } catch (error) {
      console.error('❌ Test error:', error);
      setTestResult(`Error: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={testUserQuery}>
        <Text style={styles.buttonText}>🧪 Test Database Query</Text>
      </TouchableOpacity>
      
      {testResult ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{testResult}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  button: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
}); 