import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POSTS_PER_PAGE = 10;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface Post {
  id: string;
  userId: string;
  userName: string;
  jerseyNumber: string;
  text: string;
  imageUrl?: string;
  likes: number;
  comments: string;
  createdAt: number;
  isLiked?: boolean;
  userAvatar?: string;
  location?: string;
  matchId?: string;
  hashtags?: string[];
}

interface User {
  id: string;
  name: string;
  email: string;
  jerseyNumber: string;
}

interface CacheData {
  posts: Post[];
  timestamp: number;
  users: User[];
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
  const [hasMorePosts, setHasMorePosts] = useState(true);
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'following' | 'trending' | 'recent'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Cache state
  const [cache, setCache] = useState<CacheData | null>(null);
  const [lastRefresh, setLastRefresh] = useState(0);
  
  // Animation
  const fadeAnim = new Animated.Value(0);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // Initialize and fetch data
  useEffect(() => {
    initializeFeed();
    startFadeAnimation();
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (shouldRefreshCache()) {
        fetchPosts(true);
      }
    }, [])
  );

  const startFadeAnimation = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const shouldRefreshCache = () => {
    return !cache || (Date.now() - cache.timestamp) > CACHE_DURATION;
  };

  const initializeFeed = async () => {
    try {
      // Check cache first
      if (cache && !shouldRefreshCache()) {
        console.log('📱 Using cached data');
        setPosts(cache.posts);
        setUsers(cache.users);
        setLoading(false);
        return;
      }

      await fetchPosts(true);
    } catch (error) {
      console.error('❌ Error initializing feed:', error);
      setLoading(false);
    }
  };

  const fetchPosts = async (isInitial = false, loadMore = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else if (loadMore) {
        setLoadingMore(true);
      } else {
        setRefreshing(true);
      }

      console.log('🔄 Fetching posts...');
      
      // Fetch posts and users in parallel for better performance
      const [fetchedPosts, fetchedUsers] = await Promise.all([
        db?.from('posts').getAll(),
        db?.from('users').getAll()
      ]);

      console.log(`📊 Found ${fetchedPosts?.length || 0} posts, ${fetchedUsers?.length || 0} users`);

      if (fetchedPosts && fetchedUsers) {
        const usersMap = new Map((fetchedUsers as any[]).map(u => [u.id, u]));
        
        // Enrich posts with user data and additional metadata
        const enrichedPosts = (fetchedPosts as any[])
          .map(post => enrichPost(post, usersMap))
          .sort((a, b) => b.createdAt - a.createdAt);

        // Update cache
        const newCache: CacheData = {
          posts: enrichedPosts,
          users: fetchedUsers as User[],
          timestamp: Date.now()
        };
        setCache(newCache);

        setPosts(enrichedPosts);
        setUsers(fetchedUsers as User[]);
        setLastRefresh(Date.now());
        
        console.log('✅ Posts loaded and cached successfully');
      }
    } catch (error) {
      console.error('❌ Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const enrichPost = (post: any, usersMap: Map<string, any>): Post => {
    const postUser = usersMap.get(post.userId) || usersMap.get(post.userEmail);
    
    return {
      ...post,
      userName: post.userName || postUser?.name || 'Unknown Player',
      jerseyNumber: post.jerseyNumber || postUser?.jerseyNumber || '00',
      isLiked: likedPosts.has(post.id),
      hashtags: extractHashtags(post.text || ''),
      userAvatar: postUser?.profilePicture || '',
    };
  };

  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#[\w]+/g;
    return text.match(hashtagRegex) || [];
  };

  // Optimized filtering with useMemo
  const filteredPosts = useMemo(() => {
    let filtered = [...posts];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.userName.toLowerCase().includes(query) ||
        post.text.toLowerCase().includes(query) ||
        post.hashtags?.some(tag => tag.toLowerCase().includes(query)) ||
        post.jerseyNumber.includes(searchQuery)
      );
    }

    // Apply category filter
    switch (selectedFilter) {
      case 'recent':
        // Already sorted by createdAt
        break;
      case 'trending':
        filtered = filtered.sort((a, b) => (b.likes + getCommentsCount(b)) - (a.likes + getCommentsCount(a)));
        break;
      case 'following':
        // TODO: Implement following logic
        break;
      default:
        break;
    }

    return filtered;
  }, [posts, searchQuery, selectedFilter]);

  const getCommentsCount = (post: Post): number => {
    try {
      return post.comments ? JSON.parse(post.comments).length : 0;
    } catch {
      return 0;
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

      // Update database
      await db?.from('posts').update(postId, { likes: newLikes });
      
      // Add haptic feedback
      // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('❌ Error liking post:', error);
      // Revert optimistic update
      fetchPosts();
    }
  };

  const handleShare = (post: Post) => {
    Alert.alert(
      'Share Post',
      `Share "${post.text.substring(0, 50)}..." by ${post.userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => console.log('Sharing post:', post.id) }
      ]
    );
  };

  const handleComment = (post: Post) => {
    // Navigate to comments screen
    navigation.navigate('Comments', { postId: post.id, post });
  };

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 7) return new Date(timestamp).toLocaleDateString();
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const onRefresh = useCallback(() => {
    fetchPosts(false, false);
  }, []);

  const loadMorePosts = useCallback(() => {
    if (!loadingMore && hasMorePosts && filteredPosts.length >= POSTS_PER_PAGE) {
      // In a real app, this would fetch the next page
      console.log('📄 Loading more posts...');
    }
  }, [loadingMore, hasMorePosts, filteredPosts.length]);

  const renderPost = useCallback(({ item, index }: { item: Post; index: number }) => (
    <PostCard
      post={item}
      onLike={handleLike}
      onComment={handleComment}
      onShare={handleShare}
      formatTimeAgo={formatTimeAgo}
      fadeAnim={fadeAnim}
      index={index}
    />
  ), [fadeAnim]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts, players, hashtags..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['all', 'recent', 'trending', 'following'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              selectedFilter === filter && styles.activeFilterTab
            ]}
            onPress={() => setSelectedFilter(filter as any)}
          >
            <Text style={[
              styles.filterText,
              selectedFilter === filter && styles.activeFilterText
            ]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Bar */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <MaterialIcons name="article" size={16} color="#FFD700" />
          <Text style={styles.statText}>{filteredPosts.length} posts</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="people" size={16} color="#FFD700" />
          <Text style={styles.statText}>{users.length} players</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="schedule" size={16} color="#FFD700" />
          <Text style={styles.statText}>
            {lastRefresh ? `Updated ${formatTimeAgo(lastRefresh)}` : 'Never'}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons 
        name={searchQuery ? "search-off" : "sports-cricket"} 
        size={80} 
        color="#FFD700" 
      />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No posts found!' : 'No posts yet!'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Try a different search term or clear filters'
          : 'Be the first to share your cricket moments'
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

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#FFD700" />
        <Text style={styles.footerText}>Loading more posts...</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading your feed...</Text>
          <Text style={styles.loadingSubtext}>Fetching latest cricket updates</Text>
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
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FFD700']}
            tintColor="#FFD700"
            title="Pull to refresh"
            titleColor="#666"
          />
        }
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.1}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={5}
        getItemLayout={(data, index) => ({
          length: 200, // Approximate item height
          offset: 200 * index,
          index,
        })}
        showsVerticalScrollIndicator={false}
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
    </SafeAreaView>
  );
}

// Memoized Post Card Component for better performance
const PostCard = React.memo(({ 
  post, 
  onLike, 
  onComment, 
  onShare, 
  formatTimeAgo, 
  fadeAnim, 
  index 
}: {
  post: Post;
  onLike: (id: string, likes: number) => void;
  onComment: (post: Post) => void;
  onShare: (post: Post) => void;
  formatTimeAgo: (timestamp: number) => string;
  fadeAnim: Animated.Value;
  index: number;
}) => {
  const commentsCount = React.useMemo(() => {
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
            <MaterialIcons name="person" size={24} color="#1B5E20" />
          </View>
          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{post.userName}</Text>
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified" size={14} color="#FFD700" />
              </View>
            </View>
            <View style={styles.metaRow}>
              <MaterialIcons name="sports" size={12} color="#FFD700" />
              <Text style={styles.jerseyNumber}>#{post.jerseyNumber}</Text>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.timeAgo}>{formatTimeAgo(post.createdAt)}</Text>
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

      {/* Post Image */}
      {post.imageUrl && (
        <View style={styles.imageWrapper}>
          <Image 
            source={{ uri: post.imageUrl }} 
            style={styles.postImage}
            resizeMode="cover"
            onError={() => console.log('Image load error')}
          />
        </View>
      )}

      {/* Engagement Stats */}
      <View style={styles.engagementStats}>
        <Text style={styles.engagementText}>
          {post.likes > 0 && `${post.likes} ${post.likes === 1 ? 'like' : 'likes'}`}
          {post.likes > 0 && commentsCount > 0 && ' • '}
          {commentsCount > 0 && `${commentsCount} ${commentsCount === 1 ? 'comment' : 'comments'}`}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={[styles.actionButton, post.isLiked && styles.likedButton]}
          onPress={() => onLike(post.id, post.likes)}
        >
          <MaterialIcons 
            name={post.isLiked ? "thumb-up" : "thumb-up-off-alt"} 
            size={20} 
            color={post.isLiked ? "#FFD700" : "#666"} 
          />
          <Text style={[styles.actionText, post.isLiked && styles.likedText]}>
            {post.likes || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onComment(post)}
        >
          <MaterialIcons name="comment" size={20} color="#666" />
          <Text style={styles.actionText}>{commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onShare(post)}
        >
          <MaterialIcons name="share" size={20} color="#666" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons name="bookmark-border" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#2E7D32',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  loadingSubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16,
    marginTop: 16,
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  activeFilterTab: {
    backgroundColor: '#FFD700',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F8F8',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
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
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  jerseyNumber: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 2,
  },
  separator: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 6,
  },
  timeAgo: {
    fontSize: 12,
    color: '#666',
  },
  moreButton: {
    padding: 4,
  },
  postText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  hashtag: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  imageWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F5F5F5',
  },
  engagementStats: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 8,
  },
  engagementText: {
    fontSize: 13,
    color: '#666',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  likedButton: {
    backgroundColor: '#FFF9E6',
  },
  actionText: {
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
    fontSize: 14,
  },
  likedText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    color: '#666',
    marginLeft: 8,
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
});