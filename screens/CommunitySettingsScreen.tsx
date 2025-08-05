import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../utils/supabaseClient';

interface Community {
  id: string;
  name: string;
  description: string;
  logo_url?: string;
  created_by: string;
}

export default function CommunitySettingsScreen({ route, navigation }: any) {
  const { community } = route.params || {};
  const [communityName, setCommunityName] = useState(community?.name || '');
  const [communityDescription, setCommunityDescription] = useState(community?.description || '');
  const [logoUrl, setLogoUrl] = useState(community?.logo_url || '');
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // For now, we'll use the local URI
        // In a real app, you'd upload this to Supabase Storage
        setLogoUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const saveCommunitySettings = async () => {
    if (!communityName.trim()) {
      Alert.alert('Error', 'Community name is required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('cricket_communities')
        .update({
          name: communityName.trim(),
          description: communityDescription.trim(),
          logo_url: logoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', community?.id);

      if (error) {
        console.error('Error updating community:', error);
        Alert.alert('Error', 'Failed to update community settings');
        return;
      }

      Alert.alert('Success', 'Community settings updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving community settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community Settings</Text>
        <TouchableOpacity 
          onPress={saveCommunitySettings} 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Community Logo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Logo</Text>
          <TouchableOpacity style={styles.logoContainer} onPress={pickImage}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <MaterialIcons name="add-a-photo" size={32} color="#666" />
                <Text style={styles.logoPlaceholderText}>Add Logo</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.helperText}>Tap to upload a community logo</Text>
        </View>

        {/* Community Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Name</Text>
          <TextInput
            style={styles.textInput}
            value={communityName}
            onChangeText={setCommunityName}
            placeholder="Enter community name..."
            placeholderTextColor="#999"
            maxLength={50}
          />
          <Text style={styles.helperText}>Choose a unique name for your community</Text>
        </View>

        {/* Community Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={communityDescription}
            onChangeText={setCommunityDescription}
            placeholder="Describe your community..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          <Text style={styles.helperText}>Tell others about your community</Text>
        </View>

        {/* Community Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created by:</Text>
            <Text style={styles.infoValue}>{community?.created_by || 'Unknown'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Members:</Text>
            <Text style={styles.infoValue}>4 members</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>
              {community?.created_at ? new Date(community.created_at).toLocaleDateString() : 'Unknown'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  logoPlaceholderText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
}); 