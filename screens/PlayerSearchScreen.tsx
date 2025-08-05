import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../utils/supabaseClient';

export default function PlayerSearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }
    setLoading(true);
    const search = setTimeout(async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('name', `${query.trim()}%`);
      if (!error && data) {
        setResults(data);
      } else {
        setResults([]);
      }
      setLoading(false);
    }, 250); // debounce
    return () => clearTimeout(search);
  }, [query]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.resultRow}
      onPress={() => {
        navigation.navigate('ProfileScreen', { userId: item.id });
      }}
    >
      {item.profilePicture ? (
        <Image source={{ uri: item.profilePicture }} style={styles.avatar} />
      ) : (
        <MaterialIcons name="person" size={40} color="#FFD700" style={{ marginRight: 14 }} />
      )}
      <View>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.jersey}>#{item.jerseyNumber || '00'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={26} color="#2E7D32" />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search players..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
      </View>
      {loading && <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 32 }} />}
      {query.trim().length > 0 && !loading && (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.noResults}>No players found.</Text>}
          contentContainerStyle={results.length === 0 ? { flex: 1, justifyContent: 'center', alignItems: 'center' } : {}}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginRight: 10,
    padding: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: '#222',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 14,
    backgroundColor: '#FFD700',
  },
  name: {
    fontWeight: 'bold',
    color: '#222',
    fontSize: 16,
  },
  jersey: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  noResults: {
    color: '#888',
    fontSize: 16,
    marginTop: 32,
  },
}); 