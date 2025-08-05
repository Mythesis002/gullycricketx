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
  Pressable,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { supabase } from '../utils/supabaseClient';
import { getFollowingIds } from '../utils/followers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Post {
  id: string;
  userid: string;
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

export default function SocialFeedScreen() {
  const navigation = useNavigation<any>();
  
  // Core state
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
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

  const startFadeAnimation = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const initializeFeed = useCallback(async () => {
    try {
      await fetchPosts();
    } catch (error) {
      console.error('❌ Error initializing feed:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeFeed();
    startFadeAnimation();
  }, [initializeFeed, startFadeAnimation]);

  const PAGE_SIZE = 5;
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (pageNum = 0, isRefresh = false, followingOnly = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setPage(0);
        setHasMore(true);
      } else if (!refreshing && pageNum === 0) {
        setLoading(true);
      }
      setLoadingMore(true);

      let postsQuery = supabase.from('posts').select('*').order('createdAt', { ascending: false });
      if (followingOnly) {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (userId) {
          const followingIds = await getFollowingIds(userId);
          if (followingIds.length > 0) {
            postsQuery = postsQuery.in('userid', followingIds);
          } else {
            setPosts([]);
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
            setHasMore(false);
            return;
          }
        }
      }
      const [{ data: fetchedPosts, error: postsError }, { data: fetchedUsers, error: usersError }] = await Promise.all([
        postsQuery.range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1),
        supabase.from('users').select('*')
      ]);
      if (postsError || usersError) {
        throw postsError || usersError;
      }
      if (fetchedPosts && fetchedUsers) {
        const usersMap = new Map((fetchedUsers as any[]).map(u => [u.id, u]));
        const enrichedPosts = (fetchedPosts as any[]).map(post => enrichPost(post, usersMap));
        setUsers(fetchedUsers as any[]);
        if (pageNum === 0 || isRefresh) {
          setPosts(enrichedPosts);
        } else {
          setPosts(prev => [...prev, ...enrichedPosts]);
        }
        setHasMore(fetchedPosts.length === PAGE_SIZE);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [refreshing]);

  // Initial load
  useEffect(() => {
    fetchPosts(0);
  }, [fetchPosts]);

  // Update useEffect to fetch posts for selected tab
  useEffect(() => {
    if (selectedTab === 'following') {
      fetchPosts(0, false, true);
    } else {
      fetchPosts(0);
    }
  }, [fetchPosts, selectedTab]);

  // 1. Fetch and display correct comment count for each post
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const fetchCommentCounts = async () => {
      if (posts.length === 0) return;
      const postIds = posts.map(p => p.id);
      const { data, error } = await supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds);
      if (!error && data) {
        // Count comments per post
        const counts: Record<string, number> = {};
        data.forEach((row: any) => {
          counts[row.post_id] = (counts[row.post_id] || 0) + 1;
        });
        setCommentCounts(counts);
      }
    };
    fetchCommentCounts();
  }, [posts]);

  // Remove user search logic and state
  // Remove: userSearchResults, useEffect for user search, and user search result rendering
  // Update toggleSearch to navigate to PlayerSearchScreen
  const toggleSearch = () => {
    setShowSearch(false);
    navigation.navigate('PlayerSearchScreen');
  };

  const loadMorePosts = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      fetchPosts(nextPage);
      setPage(nextPage);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchPosts(0, true);
  };

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts])
  );

  const enrichPost = (post: any, usersMap: Map<string, any>): Post => {
    const postUser = usersMap.get(post.userid);
    return {
      ...post,
      userName: post.userName || postUser?.name || 'Unknown Player',
      userAvatar: postUser?.profilePicture || '',
      jerseyNumber: post.jerseyNumber || postUser?.jerseyNumber || '00',
      isLiked: likedPosts.has(post.id),
      isBookmarked: bookmarkedPosts.has(post.id),
      hashtags: post.hashtags ? (typeof post.hashtags === 'string' ? JSON.parse(post.hashtags) : post.hashtags) : [],
      postType: post.postType || (post.imageUrl ? 'image' : 'text'),
      videoUrl: post.videoUrl || '',
      shares: post.shares || 0,
      location: post.location || '',
      taggedPlayers: post.taggedPlayers ? (typeof post.taggedPlayers === 'string' ? JSON.parse(post.taggedPlayers) : post.taggedPlayers) : [],
    };
  };

  const calculatePostScore = (post: Post): number => {
    const now = Date.now();
    const ageHours = (now - post.createdAt) / (1000 * 60 * 60);
    const engagementScore = post.likes + (getCommentsCount(post) * 2) + (post.shares * 3);
    return engagementScore / Math.pow(ageHours + 1, 0.5);
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
    switch (selectedTab) {
      case 'following':
        filtered = filtered.filter(post => {
          const postUser = users.find(u => u.id === post.userid);
          return postUser?.isFollowing;
        });
        break;
      case 'explore':
        filtered = filtered.sort((a, b) => (b.likes + getCommentsCount(b)) - (a.likes + getCommentsCount(a)));
        break;
    }
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

      // Ensure posts table allows UPDATE for authenticated users (RLS policy)
      const { error } = await supabase.from('posts').update({ likes: newLikes }).eq('id', postId);
      if (error) throw error;
    } catch (error) {
      console.error('❌ Error liking post:', error);
      Alert.alert('Error', error.message || JSON.stringify(error));
      fetchPosts();
    }
  };

  const handleDoubleTapLike = async (post: Post) => {
    if (!post.isLiked) {
      await handleLike(post.id, post.likes);
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
          <TouchableOpacity 
            onPress={() => navigation.navigate('CreatePost')} 
            style={styles.headerButton}
          >
            <MaterialIcons name="add" size={24} color="#2E7D32" />
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
        <TouchableOpacity onPress={() => setSelectedTab('feed')} style={[styles.tab, selectedTab === 'feed' && styles.activeTab]}>
          <Text style={[styles.tabText, selectedTab === 'feed' && styles.activeTabText]}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedTab('following')} style={[styles.tab, selectedTab === 'following' && styles.activeTab]}>
          <Text style={[styles.tabText, selectedTab === 'following' && styles.activeTabText]}>Following</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedTab('explore')} style={[styles.tab, selectedTab === 'explore' && styles.activeTab]}>
          <Text style={[styles.tabText, selectedTab === 'explore' && styles.activeTabText]}>Explore</Text>
        </TouchableOpacity>
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
      commentCounts={commentCounts}
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
      <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading your feed...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Only show the feed if not searching for users */}
      {(searchQuery.trim().length === 0 || !showSearch) && (
        <FlatList
          data={filteredPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="large" color="#FFD700" /> : null}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={10}
          initialNumToRender={3}
          contentContainerStyle={
            filteredPosts.length === 0 ? styles.emptyContainer : styles.listContainer
          }
        />
      )}



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
    </View>
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
  commentCounts: Record<string, number>;
}>(({ 
  post, 
  onLike, 
  onDoubleTapLike,
  onComment, 
  onShare, 
  onBookmark,
  formatTimeAgo, 
  fadeAnim, 
  index,
  commentCounts
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const heartAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();

  const handleDoubleTap = () => {
    onDoubleTapLike(post);
    
    // Heart animation
    Animated.sequence([
      Animated.timing(heartAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  };

  // Use commentCounts[post.id] for the count
  const commentsCount = commentCounts[post.id] || 0;

  // Define scale state for each
  const likeScale = useRef(new Animated.Value(1)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;

  const animateScale = (animRef: Animated.Value) => {
    Animated.sequence([
      Animated.timing(animRef, { toValue: 1.2, duration: 120, useNativeDriver: true }),
      Animated.timing(animRef, { toValue: 1, duration: 120, useNativeDriver: true })
    ]).start();
  };

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
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity onPress={() => navigation.navigate('ProfileScreen', { userId: post.userid })} style={{ flexDirection: 'row', alignItems: 'center' }}>
            {post.userAvatar ? (
              <Image source={{ uri: post.userAvatar }} style={styles.avatarImage} />
            ) : (
              <MaterialIcons name="person" size={32} color="#1B5E20" style={{ marginRight: 8 }} />
            )}
            <View style={{ marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.userName}>{post.userName}</Text>
                <Text style={styles.jerseyNumber}>  #{post.jerseyNumber}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Text style={styles.timeAgo}>{formatTimeAgo(post.createdAt)}</Text>
                {post.location ? (
                  <View style={styles.locationContainer}>
                    <Text style={styles.separator}>•</Text>
                    <MaterialIcons name="location-on" size={12} color="#666" />
                    <Text style={styles.locationText}>{post.location}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
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
          {`${post.likes || 0} ${post.likes === 1 ? 'like' : 'likes'}`}
          {commentsCount >= 0 && ' • '}
          {`${commentsCount || 0} ${commentsCount === 1 ? 'comment' : 'comments'}`}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.postActions}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => { animateScale(likeScale); onLike(post.id, post.likes); }}
          >
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <MaterialIcons 
              name={post.isLiked ? "favorite" : "favorite-border"} 
              size={24} 
              color={post.isLiked ? "#FF3040" : "#666"} 
            />
            </Animated.View>
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
          onPress={() => { animateScale(bookmarkScale); onBookmark(post.id); }}
        >
          <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
          <MaterialIcons 
            name={post.isBookmarked ? "bookmark" : "bookmark-border"} 
            size={24} 
            color={post.isBookmarked ? "#FFD700" : "#666"} 
          />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Add divider line */}
      <View style={{ height: 1, backgroundColor: '#EEE', marginVertical: 8, marginHorizontal: 16, borderRadius: 1 }} />
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
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    if (post && visible) {
      fetchComments();
    }
  }, [post, visible]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, users(name, profilePicture)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      Alert.alert('Error', error.message || JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !post) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase.from('comments').insert([{
        post_id: post.id,
        user_id: userId,
        text: newComment.trim(),
      }]);
      if (error) throw error;
      setNewComment('');
      fetchComments();
    } catch (error) {
      Alert.alert('Error', error.message || JSON.stringify(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
    >
      <View style={styles.commentsModalOverlay}>
        <TouchableOpacity 
          style={styles.commentsModalBackdrop} 
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={styles.commentsModalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Comments</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        {/* Show existing comments */}
        {loading ? (
          <ActivityIndicator size="large" color="#FFD700" style={{ margin: 20 }} />
        ) : (
          <FlatList
            data={comments}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={{
                flexDirection: 'column',
                backgroundColor: '#F8F8F8',
                borderRadius: 12,
                padding: 14,
                marginVertical: 10,
                marginHorizontal: 12,
                borderWidth: 1,
                borderColor: '#E0E0E0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <TouchableOpacity onPress={() => navigation.navigate('ProfileScreen', { userId: item.user_id })} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {item.users?.profilePicture ? (
                      <Image source={{ uri: item.users.profilePicture }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
                    ) : (
                      <MaterialIcons name="person" size={32} color="#FFD700" style={{ marginRight: 10 }} />
                    )}
                    <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 15 }}>{item.users?.name || 'User'}</Text>
                  </TouchableOpacity>
                  <Text style={{ color: '#999', fontSize: 12, marginLeft: 10, flex: 1, textAlign: 'right' }}>
                    {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                  </Text>
                </View>
                <Text style={{ color: '#333', fontSize: 16, marginLeft: 46, marginTop: 2, lineHeight: 22 }}>{item.text}</Text>
              </View>
            )}
            style={{ flex: 1 }}
          />
        )}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
            editable={!submitting}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSendComment} disabled={submitting}>
            <MaterialIcons name="send" size={20} color="#FFD700" />
          </TouchableOpacity>
        </View>
        </View>
      </View>
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
    borderBottomWidth: 0,
    borderBottomColor: '#E0E0E0',
    marginTop: 0,
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
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 16,
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
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
    paddingBottom: 12,
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
  commentsModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  commentsModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0)',
  },
  commentsModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: '50%',
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
