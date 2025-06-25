import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';

export default function DebugScreen() {
  const { db, user } = useBasic();
  const [posts, setPosts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const fetchedPosts = await db?.from('posts').getAll();
      const fetchedUsers = await db?.from('users').getAll();
      
      console.log('Debug - Posts:', fetchedPosts);
      console.log('Debug - Users:', fetchedUsers);
      console.log('Debug - Current user:', user);
      
      setPosts(fetchedPosts || []);
      setUsers(fetchedUsers || []);
    } catch (error) {
      console.error('Debug error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAllPosts = async () => {
    Alert.alert(
      'Clear All Posts',
      'Are you sure you want to delete all posts?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const post of posts) {
                await db?.from('posts').delete(post.id);
              }
              fetchData();
              Alert.alert('Success', 'All posts deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete posts');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading debug data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <MaterialIcons name="bug-report" size={24} color="#FFD700" />
          <Text style={styles.headerTitle}>Debug Information</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current User</Text>
          <View style={styles.dataContainer}>
            <Text style={styles.dataText}>
              {JSON.stringify(user, null, 2)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Posts ({posts.length})</Text>
            <TouchableOpacity style={styles.clearButton} onPress={clearAllPosts}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dataContainer}>
            <Text style={styles.dataText}>
              {JSON.stringify(posts, null, 2)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Users ({users.length})</Text>
          <View style={styles.dataContainer}>
            <Text style={styles.dataText}>
              {JSON.stringify(users, null, 2)}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={fetchData}>
          <MaterialIcons name="refresh" size={20} color="#1B5E20" />
          <Text style={styles.refreshButtonText}>Refresh Data</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E8',
  },
  loading: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#2E7D32',
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
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  dataContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  dataText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
  clearButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  refreshButtonText: {
    color: '#1B5E20',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});