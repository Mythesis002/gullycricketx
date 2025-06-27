import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Modal,
  PanGestureHandler,
  State,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const POSTS_PER_PAGE = 10;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  jerseyNumber: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  postType: 'text' | 'image' | 'video' | 'reel';
  likes: number;
  comments: string;
  shares: number;
  createdAt: number;
  location?: string;
  hashtags?: string[];
  isLiked?: boolean;
  isBookmarked?: boolean;
  taggedPlayers?: string[];
  matchId?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  jerseyNumber: string;
  avatar?: string;
  isVerified?: boolean;
  isFollowing?: boolean;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
  likes: number;
}

export default function SocialFeedScreen() {
  const { db, user } = useBasic();
  const navigation = useNavigation<any>();
  
  // Core state
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'feed' | 'following' | 'explore'>('feed');
  const [showSearch, setShowSearch] = useState(false);
  
  // Interaction state
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeFeed();
    startFadeAnimation();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [])
  );

  const startFadeAnimation = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const initializeFeed = async () => {
    try {
      await fetchPosts();
    } catch (error) {
      console.error('❌ Error initializing feed:', error);
      setLoading(false);
    }
  };

  const fetchPosts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!refreshing) {
        setLoading(true);
      }

      console.log('🔄 Fetching posts...');
      
      const [fetchedPosts, fetchedUsers] = await Promise.all([
        db?.from('posts').getAll(),
        db?.from('users').getAll()
      ]);

      if (fetchedPosts && fetchedUsers) {
        const usersMap = new Map((fetchedUsers as any[]).map(u => [u.id, u]));
        
        const enrichedPosts = (fetchedPosts as any[])
          .map(post => enrichPost(post, usersMap))
          .sort((a, b) => calculatePostScore(b) - calculatePostScore(a)); // Smart ordering

        setPosts(enrichedPosts);
        setUsers(fetchedUsers as any[]);
        
        console.log('✅ Posts loaded successfully');
      }
    } catch (error) {
      console.error('❌ Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const enrichPost = (post: any, usersMap: Map<string, any>): Post => {
    const postUser = usersMap.get(post.userId);
    
    return {
      ...post,
      userName: post.userName || postUser?.name || 'Unknown Player',
      userAvatar: postUser?.avatar || '',
      jerseyNumber: post.jerseyNumber || postUser?.jerseyNumber || '00',
      isLiked: likedPosts.has(post.id),
      isBookmarked: bookmarkedPosts.has(post.id),
      hashtags: extractHashtags(post.text || ''),
      postType: determinePostType(post),
    };
  };

  const determinePostType = (post: any): 'text' | 'image' | 'video' | 'reel' => {
    if (post.videoUrl) return post.isReel ? 'reel' : 'video';
    if (post.imageUrl) return 'image';
    return 'text';
  };

  const calculatePostScore = (post: Post): number => {
    const now = Date.now();
    const ageHours = (now - post.createdAt) / (1000 * 60 * 60);
    const engagementScore = post.likes + (getCommentsCount(post) * 2) + (post.shares * 3);
    
    // Decay score over time, but boost highly engaged content
    return engagementScore / Math.pow(ageHours + 1, 0.5);
  };

  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#[\w]+/g;
    return text.match(hashtagRegex) || [];
  };

  const getCommentsCount = (post: Post): number => {
    try {
      return post.comments ? JSON.parse(post.comments).length : 0;
    } catch {
      return 0;
    }
  };

  // Optimized filtering
  const filteredPosts = useMemo(() => {
    let filtered = [...posts];

    // Apply tab filter
    switch (selectedTab) {
      case 'following':
        filtered = filtered.filter(post => {
          const postUser = users.find(u => u.id === post.userId);
          return postUser?.isFollowing;
        });
        break;
      case 'explore':
        filtered = filtered.sort((a, b) => (b.likes + getCommentsCount(b)) - (a.likes + getCommentsCount(a)));
        break;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.userName.toLowerCase().includes(query) ||
        post.text.toLowerCase().includes(query) ||
        post.hashtags?.some(tag => tag.toLowerCase().includes(query)) ||
        post.location?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [posts, users, selectedTab, searchQuery]);

  // Interaction handlers
  const handleDoubleTapLike = async (post: Post) => {
    if (!post.isLiked) {
      await handleLike(post.id, post.likes);
      
      // Heart animation
      const heartAnim = new Animated.Value(0);
      Animated.sequence([
        Animated.timing(heartAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 0, duration: 200, useNativeDriver: true })
      ]).start();
    }
  };

  const handleLike = async (postId: string, currentLikes: number) => {
    try {
      const isCurrentlyLiked = likedPosts.has(postId);
      const newLikes = isCurrentlyLiked ? currentLikes - 1 : currentLikes + 1;

      // Optimistic update
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyLiked) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });

      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId 
            ? { ...post, likes: newLikes, isLiked: !isCurrentlyLiked }
            : post
        )
      );

      await db?.from('posts').update(postId, { likes: newLikes });
    } catch (error) {
      console.error('❌ Error liking post:', error);
      fetchPosts();
    }
  };

  const handleBookmark = async (postId: string) => {
    setBookmarkedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });

    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId 
          ? { ...post, isBookmarked: !post.isBookmarked }
          : post
      )
    );
  };

  const handleComment = (post: Post) => {
    setSelectedPost(post);
    setShowComments(true);
  };

  const handleShare = (post: Post) => {
    setSelectedPost(post);
    setShowShareModal(true);
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    Animated.timing(searchAnim, {
      toValue: showSearch ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 7) return new Date(timestamp).toLocaleDateString();
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'now';
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* App Header */}
      <View style={styles.appHeader}>
        <View style={styles.logoContainer}>
          <MaterialIcons name="sports-cricket" size={28} color="#FFD700" />
          <Text style={styles.appTitle}>GullyCricketX</Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleSearch} style={styles.headerButton}>
            <MaterialIcons name="search" size={24} color="#2E7D32" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Notifications')} 
            style={styles.headerButton}
          >
            <MaterialIcons name="notifications" size={24} color="#2E7D32" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Chat')} 
            style={styles.headerButton}
          >
            <MaterialIcons name="message" size={24} color="#2E7D32" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <Animated.View 
          style={[
            styles.searchContainer,
            {
              opacity: searchAnim,
              transform: [{
                translateY: searchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0]
                })
              }]
            }
          ]}
        >
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts, players, hashtags..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { key: 'feed', label: 'Feed', icon: 'home' },
          { key: 'following', label: 'Following', icon: 'people' },
          { key: 'explore', label: 'Explore', icon: 'explore' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              selectedTab === tab.key && styles.activeTab
            ]}
            onPress={() => setSelectedTab(tab.key as any)}
          >
            <MaterialIcons 
              name={tab.icon as any} 
              size={20} 
              color={selectedTab === tab.key ? '#FFD700' : '#666'} 
            />
            <Text style={[
              styles.tabText,
              selectedTab === tab.key && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPost = ({ item, index }: { item: Post; index: number }) => (
    <PostCard
      post={item}
      onLike={handleLike}
      onDoubleTapLike={handleDoubleTapLike}
      onComment={handleComment}
      onShare={handleShare}
      onBookmark={handleBookmark}
      formatTimeAgo={formatTimeAgo}
      fadeAnim={fadeAnim}
      index={index}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons 
        name={searchQuery ? "search-off" : "sports-cricket"} 
        size={80} 
        color="#FFD700" 
      />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No posts found!' : 'Welcome to the community!'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Try a different search term'
          : 'Start following players or create your first post'
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.createFirstPost}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <MaterialIcons name="add-circle" size={20} color="#1B5E20" />
          <Text style={styles.createFirstPostText}>Create First Post</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading your feed...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchPosts(true)}
            colors={['#FFD700']}
            tintColor="#FFD700"
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={3}
        contentContainerStyle={
          filteredPosts.length === 0 ? styles.emptyContainer : styles.listContainer
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePost')}
      >
        <MaterialIcons name="add" size={28} color="#1B5E20" />
      </TouchableOpacity>

      {/* Comments Modal */}
      <CommentsModal
        visible={showComments}
        post={selectedPost}
        onClose={() => setShowComments(false)}
      />

      {/* Share Modal */}
      <ShareModal
        visible={showShareModal}
        post={selectedPost}
        onClose={() => setShowShareModal(false)}
      />
    </SafeAreaView>
  );
}

// Enhanced Post Card Component
const PostCard = React.memo<{
  post: Post;
  onLike: (id: string, likes: number) => void;
  onDoubleTapLike: (post: Post) => void;
  onComment: (post: Post) => void;
  onShare: (post: Post) => void;
  onBookmark: (id: string) => void;
  formatTimeAgo: (timestamp: number) => string;
  fadeAnim: Animated.Value;
  index: number;
}>(({ 
  post, 
  onLike, 
  onDoubleTapLike,
  onComment, 
  onShare, 
  onBookmark,
  formatTimeAgo, 
  fadeAnim, 
  index 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const heartAnim = useRef(new Animated.Value(0)).current;

  const handleDoubleTap = () => {
    onDoubleTapLike(post);
    
    // Heart animation
    Animated.sequence([
      Animated.timing(heartAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  };

  const commentsCount = useMemo(() => {
    try {
      return post.comments ? JSON.parse(post.comments).length : 0;
    } catch {
      return 0;
    }
  }, [post.comments]);

  return (
    <Animated.View 
      style={[
        styles.postCard,
        { 
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            })
          }]
        }
      ]}
    >
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            {post.userAvatar ? (
              <Image source={{ uri: post.userAvatar }} style={styles.avatarImage} />
            ) : (
              <MaterialIcons name="person" size={24} color="#1B5E20" />
            )}
          </View>
          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{post.userName}</Text>
              <MaterialIcons name="verified" size={14} color="#FFD700" />
              <Text style={styles.jerseyNumber}>#{post.jerseyNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.timeAgo}>{formatTimeAgo(post.createdAt)}</Text>
              {post.location && (
                <>
                  <Text style={styles.separator}>•</Text>
                  <MaterialIcons name="location-on" size={12} color="#666" />
                  <Text style={styles.location}>{post.location}</Text>
                </>
              )}
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <MaterialIcons name="more-vert" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      {post.text && (
        <Text style={styles.postText}>
          {post.text}
          {post.hashtags && post.hashtags.map((tag, i) => (
            <Text key={i} style={styles.hashtag}> {tag}</Text>
          ))}
        </Text>
      )}

      {/* Post Media */}
      {post.imageUrl && (
        <Pressable onPress={handleDoubleTap} style={styles.mediaContainer}>
          <Image 
            source={{ uri: post.imageUrl }} 
            style={styles.postImage}
            resizeMode="cover"
            onLoad={() => setImageLoaded(true)}
          />
          {!imageLoaded && (
            <View style={styles.imageLoader}>
              <ActivityIndicator size="small" color="#FFD700" />
            </View>
          )}
          
          {/* Double tap heart animation */}
          <Animated.View 
            style={[
              styles.heartAnimation,
              {
                opacity: heartAnim,
                transform: [{
                  scale: heartAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1.5]
                  })
                }]
              }
            ]}
          >
            <MaterialIcons name="favorite" size={80} color="#FF3040" />
          </Animated.View>
        </Pressable>
      )}

      {/* Engagement Stats */}
      <View style={styles.engagementStats}>
        <Text style={styles.engagementText}>
          {post.likes > 0 && `${post.likes.toLocaleString()} ${post.likes === 1 ? 'like' : 'likes'}`}
          {post.likes > 0 && commentsCount > 0 && ' • '}
          {commentsCount > 0 && `${commentsCount} ${commentsCount === 1 ? 'comment' : 'comments'}`}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.postActions}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onLike(post.id, post.likes)}
          >
            <MaterialIcons 
              name={post.isLiked ? "favorite" : "favorite-border"} 
              size={24} 
              color={post.isLiked ? "#FF3040" : "#666"} 
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onComment(post)}
          >
            <MaterialIcons name="chat-bubble-outline" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onShare(post)}
          >
            <MaterialIcons name="send" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onBookmark(post.id)}
        >
          <MaterialIcons 
            name={post.isBookmarked ? "bookmark" : "bookmark-border"} 
            size={24} 
            color={post.isBookmarked ? "#FFD700" : "#666"} 
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

PostCard.displayName = 'PostCard';

// Comments Modal Component
const CommentsModal = ({ visible, post, onClose }: {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
}) => {
  const [newComment, setNewComment] = useState('');

  if (!post) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Comments</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity style={styles.sendButton}>
            <MaterialIcons name="send" size={20} color="#FFD700" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// Share Modal Component
const ShareModal = ({ visible, post, onClose }: {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
}) => {
  if (!post) return null;

  const shareOptions = [
    { icon: 'content-copy', label: 'Copy Link', action: () => console.log('Copy link') },
    { icon: 'share', label: 'Share to Story', action: () => console.log('Share to story') },
    { icon: 'message', label: 'Send Message', action: () => console.log('Send message') },
    { icon: 'report', label: 'Report Post', action: () => console.log('Report post') },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
    >
      <View style={styles.shareModalOverlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <View style={styles.shareModalContent}>
          <View style={styles.shareModalHeader}>
            <Text style={styles.shareModalTitle}>Share Post</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {shareOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.shareOption}
              onPress={() => {
                option.action();
                onClose();
              }}
            >
              <MaterialIcons name={option.icon as any} size={24} color="#2E7D32" />
              <Text style={styles.shareOptionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#2E7D32',
    fontSize: 16,
    marginTop: 16,
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 16,
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  activeTab: {
    backgroundColor: '#2E7D32',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  createFirstPost: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  createFirstPostText: {
    color: '#1B5E20',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 1,
    paddingVertical: 12,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 4,
  },
  jerseyNumber: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timeAgo: {
    fontSize: 12,
    color: '#666',
  },
  separator: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 4,
  },
  location: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  moreButton: {
    padding: 4,
  },
  postText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  hashtag: {
    color: '#1DA1F2',
    fontWeight: '500',
  },
  mediaContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  postImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#F5F5F5',
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  heartAnimation: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -40,
    marginLeft: -40,
  },
  engagementStats: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  engagementText: {
    fontSize: 13,
    color: '#000',
    fontWeight: '500',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  leftActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginRight: 16,
    padding: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
  shareModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  shareModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  shareModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  shareOptionText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 16,
  },
});