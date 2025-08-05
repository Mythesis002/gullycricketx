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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../utils/supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [bio, setBio] = useState('');
  const [originalProfile, setOriginalProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [nameAvailable, setNameAvailable] = useState<null | boolean>(null);
  const [checkingName, setCheckingName] = useState(false);
  const normalizeName = (input: string) => {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    // Get authenticated user ID on mount
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    getUserId();
  }, []);

  useEffect(() => {
    if (userId) fetchCurrentProfile();
    if (userId) fetchUserPosts();
  }, [userId]);

  const handleNameChange = (input: string) => {
    const normalized = normalizeName(input);
    setName(normalized);
    if (!/^[a-z0-9]+( [a-z0-9]+)*$/.test(normalized)) {
      setNameError('Only lowercase letters, numbers, and single spaces allowed');
    } else {
      setNameError('');
    }
  };

  useEffect(() => {
    if (!name.trim() || !originalProfile || !originalProfile.id || nameError) {
      setNameAvailable(null);
      return;
    }
    setCheckingName(true);
    const timeout = setTimeout(async () => {
      const { data: users, error } = await supabase.from('users').select('id').eq('name', name);
      if (error) {
        setNameAvailable(null);
      } else {
        setNameAvailable(!users || users.length === 0 || (users.length === 1 && users[0].id === originalProfile.id));
      }
      setCheckingName(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [name, originalProfile?.id, nameError]);

  const fetchCurrentProfile = async () => {
    if (!userId) return;
    try {
      const { data: user, error } = await supabase.from('users').select('*').eq('id', userId).single();
      if (error) throw error;
      if (user) {
        setOriginalProfile(user);
        setName(user.name || '');
        setJerseyNumber(user.jerseyNumber || '');
        setBio(user.bio || '');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    if (!userId) return;
    try {
      const { data: posts, error } = await supabase.from('posts').select('*').eq('userid', userId);
      if (error) throw error;
      if (posts) {
        setUserPosts(posts.sort((a, b) => b.createdAt - a.createdAt));
      }
    } catch (error) {
      console.error('Error fetching user posts:', error);
    }
  };

  const validateForm = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return false;
    }
    // Check if name is unique (excluding current user)
    try {
      const { data: users, error } = await supabase.from('users').select('id').eq('name', name.trim());
      if (error) throw error;
      if (users && users.length > 0 && users[0].id !== originalProfile.id) {
        Alert.alert('Name Taken', 'This name is already taken. Please choose a unique name.');
        return false;
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify name. Please try again.');
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

  const pickProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadProfileImage = async () => {
    if (!profileImage || !userId) return null;
    try {
      // Read file as base64
      const fileBase64 = await FileSystem.readAsStringAsync(profileImage, { encoding: FileSystem.EncodingType.Base64 });
      const contentType = 'image/jpeg'; // You can improve this by detecting from file extension
      const filePath = `${userId}_${Date.now()}.jpg`;
      // Upload as base64 string
      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(filePath, Buffer.from(fileBase64, 'base64'), {
          contentType,
          upsert: true,
        });
      if (error) throw error;
      // Get public URL
      const { data: publicUrlData } = supabase.storage.from('profile-images').getPublicUrl(filePath);
      return publicUrlData?.publicUrl || null;
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Error', error.message || JSON.stringify(error));
      return null;
    }
  };

  const deleteProfileImage = async () => {
    if (!originalProfile?.profilePicture) return;
    try {
      // Extract file name from URL
      const urlParts = originalProfile.profilePicture.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0];
      const { error } = await supabase.storage.from('profile-images').remove([fileName]);
      if (error) throw error;
      // Update user profile to remove image
      const { error: updateError } = await supabase.from('users').update({ profilePicture: '' }).eq('id', userId);
      if (updateError) throw updateError;
      setProfileImage(null);
      setOriginalProfile({ ...originalProfile, profilePicture: '' });
      Alert.alert('Removed', 'Profile image removed successfully.');
    } catch (error) {
      console.error('Error deleting profile image:', error);
      Alert.alert('Error', error.message || JSON.stringify(error));
    }
  };

  const handleSaveProfile = async () => {
    if (!validateForm() || !userId) return;
    setSaving(true);
    try {
      // No jersey number uniqueness check
      // Upload profile image if changed
      let profilePictureUrl = originalProfile?.profilePicture || '';
      if (profileImage && profileImage !== originalProfile?.profilePicture) {
        const uploadedUrl = await uploadProfileImage();
        if (uploadedUrl) profilePictureUrl = uploadedUrl;
      }
      // Update profile
      const updatedProfile = {
        name: name.trim(),
        jerseyNumber: jerseyNumber.trim(),
        bio: bio.trim(),
        profilePicture: profilePictureUrl,
      };
      console.log('Updating profile with:', updatedProfile);
      const { data: updatedUser, error } = await supabase.from('users').update(updatedProfile).eq('id', userId);
      if (error) throw error;
      Alert.alert(
        'Success! 🎉',
        'Your profile has been updated successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || JSON.stringify(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              const { error } = await supabase.from('posts').delete().eq('id', postId);
              if (error) throw error;
              setUserPosts(posts => posts.filter(p => p.id !== postId));
              Alert.alert('Deleted', 'Post deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete post');
            }
          }
        }
      ]
    );
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
                {nameError ? (
                  <Text style={{ color: '#F44336', marginLeft: 8 }}>{nameError}</Text>
                ) : null}
              </View>
              {name.trim() && nameAvailable === true && !checkingName && (
                <Text style={{ color: '#4CAF50', marginLeft: 36, marginTop: 2 }}>Name available</Text>
              )}
              {name.trim() && nameAvailable === false && !checkingName && (
                <Text style={{ color: '#F44336', marginLeft: 36, marginTop: 2 }}>Name not available</Text>
              )}
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

            {/* Profile Image Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Profile Image</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity style={styles.profileImagePicker} onPress={pickProfileImage}>
                  {profileImage || originalProfile?.profilePicture ? (
                    <Image
                      source={{ uri: profileImage || originalProfile?.profilePicture }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <MaterialIcons name="person" size={60} color="#FFD700" />
                  )}
                  <Text style={styles.changeImageText}>Change Image</Text>
                </TouchableOpacity>
                {(profileImage || originalProfile?.profilePicture) && (
                  <TouchableOpacity onPress={deleteProfileImage} style={{ marginLeft: 12 }}>
                    <MaterialIcons name="delete" size={28} color="#FF5722" />
                    <Text style={{ color: '#FF5722', fontSize: 12 }}>Remove Image</Text>
                  </TouchableOpacity>
                )}
              </View>
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

          {/* User's Posts Section */}
          <View style={styles.postsSection}>
            <Text style={styles.sectionTitle}>Your Posts</Text>
            {userPosts.length === 0 ? (
              <Text style={styles.noPostsText}>You haven't posted yet.</Text>
            ) : (
              userPosts.map(post => (
                <View key={post.id} style={styles.postItem}>
                  <Text style={styles.postText}>{post.text}</Text>
                  <TouchableOpacity onPress={() => handleDeletePost(post.id)} style={styles.deletePostButton}>
                    <MaterialIcons name="delete" size={20} color="#FF5722" />
                    <Text style={styles.deletePostText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, { opacity: !nameAvailable || name === originalProfile.name || !!nameError ? 0.5 : 1 }]}
            onPress={handleSaveProfile}
            disabled={!nameAvailable || name === originalProfile.name || saving || !!nameError}
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
  profileImagePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  changeImageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  postsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  noPostsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  postItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 12,
    marginBottom: 12,
  },
  postText: {
    fontSize: 16,
    color: '#333',
  },
  deletePostButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deletePostText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5722',
    marginLeft: 8,
  },
});