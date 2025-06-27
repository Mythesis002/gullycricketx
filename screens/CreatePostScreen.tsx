import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
}

export default function CreatePostScreen() {
  const { db, user } = useBasic();
  const navigation = useNavigation<any>();
  
  const [postText, setPostText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
  const [posting, setPosting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [characterCount, setCharacterCount] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [taggedPlayers, setTaggedPlayers] = useState<string[]>([]);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  
  const MAX_CHARACTERS = 2200; // Instagram-like limit
  const MAX_MEDIA = 10;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchUserProfile();
    fetchAllPlayers();
    requestPermissions();
    startAnimation();
  }, []);

  const startAnimation = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const requestPermissions = async () => {
    const [mediaStatus, locationStatus] = await Promise.all([
      ImagePicker.requestMediaLibraryPermissionsAsync(),
      Location.requestForegroundPermissionsAsync()
    ]);
    
    if (mediaStatus.status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to share media.');
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

  const fetchAllPlayers = async () => {
    try {
      const users = await db?.from('users').getAll();
      setAllPlayers((users as any[]) || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handleTextChange = (text: string) => {
    if (text.length <= MAX_CHARACTERS) {
      setPostText(text);
      setCharacterCount(text.length);
    }
  };

  const pickMedia = async (type: 'image' | 'video' | 'mixed' = 'mixed') => {
    try {
      const mediaTypes = type === 'image' 
        ? ImagePicker.MediaTypeOptions.Images
        : type === 'video'
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.All;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsMultipleSelection: true,
        selectionLimit: MAX_MEDIA - selectedMedia.length,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newMedia: MediaItem[] = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          width: asset.width,
          height: asset.height,
        }));
        
        setSelectedMedia(prev => [...prev, ...newMedia].slice(0, MAX_MEDIA));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const removeMedia = (index: number) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      if (address[0]) {
        const locationString = `${address[0].city}, ${address[0].region}`;
        setCurrentLocation(locationString);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const handlePost = async () => {
    if (!postText.trim() && selectedMedia.length === 0) {
      Alert.alert('Empty Post', 'Please add some content to your post.');
      return;
    }

    setPosting(true);

    try {
      const postData = {
        userId: user?.id || '',
        userName: userProfile?.name || user?.name || 'Unknown Player',
        jerseyNumber: userProfile?.jerseyNumber || '00',
        text: postText.trim(),
        imageUrl: selectedMedia.find(m => m.type === 'image')?.uri || '',
        videoUrl: selectedMedia.find(m => m.type === 'video')?.uri || '',
        postType: selectedMedia.length > 0 
          ? selectedMedia[0].type 
          : 'text',
        likes: 0,
        comments: '[]',
        shares: 0,
        createdAt: Date.now(),
        location: currentLocation,
        hashtags: JSON.stringify(extractHashtags(postText)),
        taggedPlayers: JSON.stringify(taggedPlayers),
      };

      await db?.from('posts').add(postData);

      Alert.alert(
        'Posted! 🎉',
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
      setSelectedMedia([]);
      setCharacterCount(0);
      setCurrentLocation('');
      setTaggedPlayers([]);

    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#[\w]+/g;
    return text.match(hashtagRegex) || [];
  };

  const suggestedHashtags = [
    '#cricket', '#gullycricket', '#batting', '#bowling', 
    '#wicket', '#century', '#sixer', '#teamwork', '#practice',
    '#match', '#tournament', '#victory', '#sports', '#fitness'
  ];

  const addHashtag = (hashtag: string) => {
    if (!postText.includes(hashtag)) {
      const newText = postText + (postText.endsWith(' ') ? '' : ' ') + hashtag + ' ';
      handleTextChange(newText);
    }
  };

  const togglePlayerTag = (playerId: string) => {
    setTaggedPlayers(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
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
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>New Post</Text>
          
          <TouchableOpacity
            style={[
              styles.postButton,
              { opacity: (!postText.trim() && selectedMedia.length === 0) || posting ? 0.5 : 1 }
            ]}
            onPress={handlePost}
            disabled={(!postText.trim() && selectedMedia.length === 0) || posting}
          >
            <Text style={styles.postButtonText}>
              {posting ? 'Posting...' : 'Share'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim }}>
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

            {/* Selected Media */}
            {selectedMedia.length > 0 && (
              <View style={styles.mediaSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedMedia.map((media, index) => (
                    <View key={index} style={styles.mediaItem}>
                      <Image source={{ uri: media.uri }} style={styles.mediaPreview} />
                      <TouchableOpacity 
                        style={styles.removeMediaButton} 
                        onPress={() => removeMedia(index)}
                      >
                        <MaterialIcons name="close" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                      {media.type === 'video' && (
                        <View style={styles.videoIndicator}>
                          <MaterialIcons name="play-circle-filled" size={24} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Location */}
            {currentLocation && (
              <View style={styles.locationSection}>
                <MaterialIcons name="location-on" size={16} color="#666" />
                <Text style={styles.locationText}>{currentLocation}</Text>
                <TouchableOpacity onPress={() => setCurrentLocation('')}>
                  <MaterialIcons name="close" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}

            {/* Tagged Players */}
            {taggedPlayers.length > 0 && (
              <View style={styles.taggedSection}>
                <MaterialIcons name="people" size={16} color="#666" />
                <Text style={styles.taggedText}>
                  with {taggedPlayers.map(id => {
                    const player = allPlayers.find(p => p.id === id);
                    return player?.name || 'Unknown';
                  }).join(', ')}
                </Text>
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
            <View style={styles.mediaOptionsSection}>
              <Text style={styles.sectionTitle}>Add to your post</Text>
              <View style={styles.mediaOptions}>
                <TouchableOpacity 
                  style={styles.mediaOption} 
                  onPress={() => pickMedia('image')}
                  disabled={selectedMedia.length >= MAX_MEDIA}
                >
                  <MaterialIcons name="photo" size={24} color="#4CAF50" />
                  <Text style={styles.mediaOptionText}>Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.mediaOption} 
                  onPress={() => pickMedia('video')}
                  disabled={selectedMedia.length >= MAX_MEDIA}
                >
                  <MaterialIcons name="videocam" size={24} color="#FF9800" />
                  <Text style={styles.mediaOptionText}>Video</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.mediaOption}
                  onPress={getCurrentLocation}
                >
                  <MaterialIcons name="location-on" size={24} color="#F44336" />
                  <Text style={styles.mediaOptionText}>Location</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.mediaOption}
                  onPress={() => setShowPlayerPicker(true)}
                >
                  <MaterialIcons name="people" size={24} color="#2196F3" />
                  <Text style={styles.mediaOptionText}>Tag Players</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tips */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>💡 Posting Tips:</Text>
              <Text style={styles.tipText}>• Use hashtags to reach more cricket fans</Text>
              <Text style={styles.tipText}>• Tag teammates to increase engagement</Text>
              <Text style={styles.tipText}>• Add location to connect with local players</Text>
              <Text style={styles.tipText}>• Share your best cricket moments</Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Player Picker Modal */}
        <Modal
          visible={showPlayerPicker}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tag Players</Text>
              <TouchableOpacity onPress={() => setShowPlayerPicker(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.playerList}>
              {allPlayers.map((player) => (
                <TouchableOpacity
                  key={player.id}
                  style={styles.playerItem}
                  onPress={() => togglePlayerTag(player.id)}
                >
                  <View style={styles.playerInfo}>
                    <View style={styles.playerAvatar}>
                      <MaterialIcons name="person" size={20} color="#1B5E20" />
                    </View>
                    <View>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <Text style={styles.playerJersey}>#{player.jerseyNumber}</Text>
                    </View>
                  </View>
                  <MaterialIcons 
                    name={taggedPlayers.includes(player.id) ? "check-circle" : "radio-button-unchecked"} 
                    size={24} 
                    color={taggedPlayers.includes(player.id) ? "#4CAF50" : "#666"} 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  postButton: {
    backgroundColor: '#1DA1F2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  postButtonText: {
    color: '#FFFFFF',
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
    color: '#000',
  },
  jerseyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  jerseyNumber: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  textSection: {
    marginBottom: 16,
  },
  textInput: {
    fontSize: 18,
    color: '#000',
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
  mediaSection: {
    marginBottom: 16,
  },
  mediaItem: {
    position: 'relative',
    marginRight: 8,
  },
  mediaPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  taggedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 16,
  },
  taggedText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  hashtagSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
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
    backgroundColor: '#1DA1F2',
    borderColor: '#1DA1F2',
  },
  hashtagText: {
    fontSize: 12,
    color: '#666',
  },
  selectedHashtagText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  mediaOptionsSection: {
    marginBottom: 16,
  },
  mediaOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mediaOption: {
    alignItems: 'center',
    padding: 12,
    opacity: 1,
  },
  mediaOptionText: {
    fontSize: 12,
    color: '#000',
    marginTop: 4,
    fontWeight: '500',
  },
  tipsSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  playerList: {
    flex: 1,
    padding: 16,
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  playerJersey: {
    fontSize: 12,
    color: '#666',
  },
});