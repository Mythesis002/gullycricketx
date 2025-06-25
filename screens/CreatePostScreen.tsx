import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
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
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images.');
      return;
    }

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

  const removeImage = () => {
    setSelectedImage(null);
  };

  const handlePost = async () => {
    if (!text.trim() && !selectedImage) {
      Alert.alert('Error', 'Please add some text or an image to your post.');
      return;
    }

    if (text.length > 500) {
      Alert.alert('Error', 'Post text cannot exceed 500 characters.');
      return;
    }

    setPosting(true);

    try {
      console.log('Creating post...');
      console.log('User:', user);
      
      // Get user profile to get jersey number
      const userProfiles = await db?.from('users').getAll();
      console.log('User profiles:', userProfiles);
      
      const currentUser = (userProfiles as any[])?.find(u => u.email === user?.email);
      console.log('Current user profile:', currentUser);

      const postData = {
        userId: user?.id || user?.email || 'unknown',
        userName: currentUser?.name || user?.name || 'Cricket Player',
        jerseyNumber: currentUser?.jerseyNumber || '00',
        text: text.trim(),
        imageUrl: selectedImage || '',
        likes: 0,
        comments: JSON.stringify([]),
        createdAt: Date.now(),
      };

      console.log('Post data:', postData);
      
      const result = await db?.from('posts').add(postData);
      console.log('Post created:', result);
      
      Alert.alert('Success! 🎉', 'Your post has been shared with the cricket community!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <MaterialIcons name="create" size={24} color="#FFD700" />
            <Text style={styles.headerTitle}>Share Your Cricket Moment</Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="What's happening in your cricket world? Share your thoughts, match updates, or cricket memories..."
              placeholderTextColor="#999"
              multiline
              value={text}
              onChangeText={setText}
              maxLength={500}
              textAlignVertical="top"
            />
            
            <View style={styles.characterCount}>
              <Text style={[
                styles.characterCountText,
                { color: text.length > 450 ? '#FF5722' : '#666' }
              ]}>
                {text.length}/500
              </Text>
            </View>
          </View>

          {selectedImage && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                <MaterialIcons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <MaterialIcons name="photo-camera" size={24} color="#FFD700" />
              <Text style={styles.imageButtonText}>Add Photo</Text>
            </TouchableOpacity>

            <View style={styles.postButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.postButton,
                  { opacity: (!text.trim() && !selectedImage) || posting ? 0.5 : 1 }
                ]}
                onPress={handlePost}
                disabled={(!text.trim() && !selectedImage) || posting}
              >
                <MaterialIcons 
                  name={posting ? "hourglass-empty" : "send"} 
                  size={20} 
                  color="#1B5E20" 
                />
                <Text style={styles.postButtonText}>
                  {posting ? 'Posting...' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Post Tips:</Text>
            <Text style={styles.tipText}>• Share match highlights and scores</Text>
            <Text style={styles.tipText}>• Post team celebrations and victories</Text>
            <Text style={styles.tipText}>• Share cricket tips and techniques</Text>
            <Text style={styles.tipText}>• Upload action shots from matches</Text>
            <Text style={styles.tipText}>• Keep it cricket-focused and positive!</Text>
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
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  textInput: {
    fontSize: 16,
    color: '#333',
    padding: 16,
    minHeight: 120,
    lineHeight: 22,
  },
  characterCount: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  characterCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  imageButtonText: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  postButtonContainer: {
    flex: 1,
    marginLeft: 16,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  postButtonText: {
    color: '#1B5E20',
    fontWeight: 'bold',
    fontSize: 16,
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
});
