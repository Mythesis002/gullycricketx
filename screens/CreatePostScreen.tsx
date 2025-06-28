import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

export default function CreatePostScreen() {
  const { db, user } = useBasic();
  const navigation = useNavigation<any>();
  
  const [postText, setPostText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [characterCount, setCharacterCount] = useState(0);
  
  const MAX_CHARACTERS = 500;

  useEffect(() => {
    fetchUserProfile();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to share images.');
    }
  };

  const fetchUserProfile = async () => {
    try {
      const users = await db?.from('users').getAll();
      const profile = (users as any[])?.find(u => u.email === user?.email);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleTextChange = (text: string) => {
    if (text.length <= MAX_CHARACTERS) {
      setPostText(text);
      setCharacterCount(text.length);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const handlePost = async () => {
    if (!postText.trim() && !selectedImage) {
      Alert.alert('Empty Post', 'Please add some text or an image to your post.');
      return;
    }

    setPosting(true);

    try {
      // Create a simple post object that matches the schema
      const postData = {
        userId: user?.id || '',
        userName: userProfile?.name || user?.name || 'Unknown Player',
        jerseyNumber: userProfile?.jerseyNumber || '00',
        text: postText.trim(),
        imageUrl: selectedImage || '',
        videoUrl: '', // Empty string for now
        postType: selectedImage ? 'image' : 'text',
        likes: 0,
        comments: '[]',
        shares: 0,
        createdAt: Date.now(),
        location: '',
        hashtags: '[]', // Empty array as string
        taggedPlayers: '[]', // Empty array as string
      };

      console.log('📝 Creating post with data:', postData);
      await db?.from('posts').add(postData);

      Alert.alert(
        'Success! 🎉',
        'Your post has been shared with the cricket community!',
        [
          {
            text: 'View Post',
            onPress: () => {
              navigation.goBack();
            }
          }
        ]
      );

      // Reset form
      setPostText('');
      setSelectedImage(null);
      setCharacterCount(0);

    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const suggestedHashtags = [
    '#cricket', '#gullycricket', '#batting', '#bowling', 
    '#wicket', '#century', '#sixer', '#teamwork'
  ];

  const addHashtag = (hashtag: string) => {
    if (!postText.includes(hashtag)) {
      const newText = postText + (postText.endsWith(' ') ? '' : ' ') + hashtag + ' ';
      handleTextChange(newText);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Create Post</Text>
          
          <TouchableOpacity
            style={[
              styles.postButton,
              { opacity: (!postText.trim() && !selectedImage) || posting ? 0.5 : 1 }
            ]}
            onPress={handlePost}
            disabled={(!postText.trim() && !selectedImage) || posting}
          >
            <Text style={styles.postButtonText}>
              {posting ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Info */}
          <View style={styles.userSection}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={32} color="#1B5E20" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {userProfile?.name || user?.name || 'Cricket Player'}
              </Text>
              <View style={styles.jerseyContainer}>
                <MaterialIcons name="sports" size={14} color="#FFD700" />
                <Text style={styles.jerseyNumber}>
                  #{userProfile?.jerseyNumber || '00'}
                </Text>
              </View>
            </View>
          </View>

          {/* Text Input */}
          <View style={styles.textSection}>
            <TextInput
              style={styles.textInput}
              placeholder="What's happening in your cricket world?"
              placeholderTextColor="#999"
              multiline
              value={postText}
              onChangeText={handleTextChange}
              maxLength={MAX_CHARACTERS}
              autoFocus
            />
            
            {/* Character Count */}
            <View style={styles.characterCount}>
              <Text style={[
                styles.countText,
                { color: characterCount > MAX_CHARACTERS * 0.9 ? '#FF5722' : '#666' }
              ]}>
                {characterCount}/{MAX_CHARACTERS}
              </Text>
            </View>
          </View>

          {/* Selected Image */}
          {selectedImage && (
            <View style={styles.imageSection}>
              <View style={styles.imageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                  <MaterialIcons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Suggested Hashtags */}
          <View style={styles.hashtagSection}>
            <Text style={styles.sectionTitle}>Suggested Hashtags</Text>
            <View style={styles.hashtagContainer}>
              {suggestedHashtags.map((hashtag, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.hashtagChip,
                    postText.includes(hashtag) && styles.selectedHashtagChip
                  ]}
                  onPress={() => addHashtag(hashtag)}
                >
                  <Text style={[
                    styles.hashtagText,
                    postText.includes(hashtag) && styles.selectedHashtagText
                  ]}>
                    {hashtag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Media Options */}
          <View style={styles.mediaSection}>
            <Text style={styles.sectionTitle}>Add to your post</Text>
            <View style={styles.mediaOptions}>
              <TouchableOpacity style={styles.mediaOption} onPress={pickImage}>
                <MaterialIcons name="photo" size={24} color="#FFD700" />
                <Text style={styles.mediaOptionText}>Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.mediaOption}>
                <MaterialIcons name="location-on" size={24} color="#FFD700" />
                <Text style={styles.mediaOptionText}>Location</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.mediaOption}>
                <MaterialIcons name="sports-cricket" size={24} color="#FFD700" />
                <Text style={styles.mediaOptionText}>Match</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.mediaOption}>
                <MaterialIcons name="emoji-emotions" size={24} color="#FFD700" />
                <Text style={styles.mediaOptionText}>Feeling</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 Posting Tips:</Text>
            <Text style={styles.tipText}>• Use hashtags to reach more cricket fans</Text>
            <Text style={styles.tipText}>• Share your best cricket moments</Text>
            <Text style={styles.tipText}>• Engage with other players&apos; posts</Text>
            <Text style={styles.tipText}>• Keep it positive and sportsmanlike</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  cancelButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  postButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  postButtonText: {
    color: '#1B5E20',
    fontWeight: 'bold',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
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
  textSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  textInput: {
    fontSize: 18,
    color: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  countText: {
    fontSize: 12,
  },
  imageSection: {
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: 200,
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
  hashtagSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  hashtagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtagChip: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedHashtagChip: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  hashtagText: {
    fontSize: 12,
    color: '#666',
  },
  selectedHashtagText: {
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  mediaSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  mediaOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mediaOption: {
    alignItems: 'center',
    padding: 12,
  },
  mediaOptionText: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 4,
    fontWeight: '500',
  },
  tipsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 16,
  },
});