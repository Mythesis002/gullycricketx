import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../utils/supabaseClient';
import { useNavigation } from '@react-navigation/native';

export default function CreatePostScreen() {
  const navigation = useNavigation();
  const [postText, setPostText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [posting, setPosting] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  React.useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;
      const { data: user, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      if (user) setUserProfile(user);
    } catch (error) {
      // Silent fail
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const removeImage = () => setSelectedImage(null);

  const handlePost = async () => {
    if (!postText.trim() && !selectedImage) return;
    setPosting(true);
    let imageUrl = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('User not authenticated');
      if (selectedImage) {
        const manipResult = await ImageManipulator.manipulateAsync(
          selectedImage,
          [{ resize: { width: 1080 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        const fileName = `post_${userId}_${Date.now()}.jpg`;
        if (Platform.OS === 'web') {
          const imageBlob = await fetch(manipResult.uri).then(res => res.blob());
          await supabase.storage.from('post-images').upload(fileName, imageBlob, { contentType: 'image/jpeg', upsert: false });
        } else {
          const file = { uri: manipResult.uri, type: 'image/jpeg', name: fileName };
          await supabase.storage.from('post-images').upload(fileName, file);
        }
        const { data: publicUrlData } = supabase.storage.from('post-images').getPublicUrl(fileName);
        imageUrl = publicUrlData?.publicUrl || '';
      }
      // Only now create the post
      const postData = {
        userid: userId,
        userName: userProfile?.name || 'Unknown Player',
        jerseyNumber: userProfile?.jerseyNumber || '00',
        text: postText.trim(),
        imageUrl: imageUrl,
        videoUrl: '',
        postType: imageUrl ? 'image' : 'text',
        likes: 0,
        comments: '[]',
        shares: 0,
        createdAt: Date.now(),
        location: '',
        hashtags: '[]',
        taggedPlayers: '[]',
      };
      const { error: postError } = await supabase.from('posts').insert([postData]);
      setPosting(false);
      if (postError) {
        alert('Failed to create post');
        return;
      }
      setPostText('');
      setSelectedImage(null);
      navigation.goBack();
    } catch (error) {
      setPosting(false);
      alert(error.message || 'Error creating post');
    }
  };

  return (
    <View style={styles.container}>
      {/* User Info */}
      <View style={styles.userSection}>
        <View style={styles.avatar}>
          {userProfile?.profilePicture ? (
            <Image source={{ uri: userProfile.profilePicture }} style={styles.avatarImage} />
          ) : (
            <Text style={{ fontSize: 24, color: '#2E7D32', fontWeight: 'bold' }}>
              {userProfile?.name ? userProfile.name[0] : '?'}
            </Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userProfile?.name || 'Cricket Player'}</Text>
          <View style={styles.jerseyContainer}>
            <Text style={styles.jerseyNumber}>#{userProfile?.jerseyNumber || '00'}</Text>
          </View>
        </View>
      </View>

      {/* Text Input */}
      <TextInput
        style={styles.textInput}
        placeholder="What's happening?"
        value={postText}
        onChangeText={setPostText}
        multiline
        maxLength={500}
      />
      <Text style={styles.countText}>{postText.length}/500</Text>

      {/* Image Preview */}
      {selectedImage && (
        <View style={styles.imageSection}>
          <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
          <TouchableOpacity onPress={removeImage} style={styles.removeImageButton}>
            <Text style={styles.removeImageButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Photo Button */}
      <TouchableOpacity onPress={pickImage} style={styles.addPhotoButton}>
        <Text style={styles.addPhotoText}>+ Add Photo</Text>
      </TouchableOpacity>

      {/* Post Button */}
      <TouchableOpacity
        onPress={handlePost}
        disabled={posting || (!postText.trim() && !selectedImage)}
        style={[styles.postButton, { opacity: posting || (!postText.trim() && !selectedImage) ? 0.5 : 1 }]}
      >
        {posting ? <ActivityIndicator color="#2E7D32" /> : <Text style={styles.postButtonText}>Post</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  jerseyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  jerseyNumber: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  textInput: {
    fontSize: 18,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  countText: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  imageSection: {
    marginBottom: 12,
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  addPhotoText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 16,
  },
  postButton: {
    backgroundColor: '#FFD700',
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  postButtonText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
