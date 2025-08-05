import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Animated,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { supabase } from '../utils/supabaseClient';
import { followUser, unfollowUser, isFollowing, getFollowersCount, getFollowingCount } from '../utils/followers';
import * as ImagePicker from 'expo-image-picker';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  jerseyNumber: string;
  bio: string;
  profilePicture?: string;
  matchesPlayed: number;
  totalRuns: number;
  totalWickets: number;
  battingAverage: number;
  strikeRate: number;
  bowlingAverage: number;
  economyRate: number;
  badges: string;
  createdAt: number;
}

interface Post {
  id: string;
  userid: string;
  userName: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  postType: string;
  likes: number;
  comments: string;
  shares: number;
  createdAt: number;
  location?: string;
  hashtags?: string;
}

interface CricketStats {
  centuries: number;
  halfCenturies: number;
  highestScore: number;
  bestBowling: string;
  catches: number;
  runOuts: number;
  ducks: number;
  sixes: number;
  fours: number;
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  dateEarned: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const userIdFromParams = route.params?.userId;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'stats' | 'posts' | 'achievements'>('stats');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [viewedUserId, setViewedUserId] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ballStats, setBallStats] = useState<any>(null);

  useEffect(() => {
    // Get authenticated user ID on mount
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || null;
      setCurrentUserId(currentUserId);
      setViewedUserId(userIdFromParams || currentUserId);
    };
    getUserId();
  }, [userIdFromParams]);

  const initializeProfile = useCallback(async () => {
    await Promise.all([
      fetchProfile(viewedUserId),
      fetchUserPosts()
    ]);
  }, [viewedUserId]);

  const fetchUserPosts = useCallback(async () => {
    if (!viewedUserId) return;
    try {
      const { data: posts, error } = await supabase.from('posts').select('*').eq('userid', viewedUserId);
      if (error) throw error;
      if (posts) {
        setUserPosts(posts.sort((a, b) => b.createdAt - a.createdAt));
      }
    } catch (error) {
      console.error('❌ Error fetching user posts:', error);
    }
  }, [viewedUserId]);

  useEffect(() => {
    if (viewedUserId) {
    initializeProfile();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
    }
  }, [initializeProfile, fadeAnim, viewedUserId]);

  useFocusEffect(
    useCallback(() => {
      if (viewedUserId) fetchUserPosts();
    }, [fetchUserPosts, viewedUserId])
  );

  useEffect(() => {
    if (profile?.id) {
      getFollowersCount(profile.id).then(setFollowersCount);
      getFollowingCount(profile.id).then(setFollowingCount);
      if (currentUserId && profile.id !== currentUserId) {
        isFollowing(profile.id).then(setFollowing);
      }
    }
  }, [profile?.id, currentUserId]);

  const fetchProfile = async (uid: string) => {
    if (!uid) return;
    try {
      const { data: user, error } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
      if (error) throw error;
      if (user) {
        setProfile(user as UserProfile);
        } else {
        Alert.alert('Profile not found', 'No profile found for this user.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile: ' + (error.message || JSON.stringify(error)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    initializeProfile();
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  // Function to handle profile picture update
  const handleProfilePicUpdate = async () => {
    if (!profile?.id || profile.id !== currentUserId) return;
    // Ask for permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant photo library permissions to update your profile picture.');
      return;
    }
    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const file = result.assets[0];
      const fileName = `profile_${profile.id}_${Date.now()}.jpg`;
      // Upload to Supabase Storage (bucket: 'profileimage')
      const { data, error } = await supabase.storage.from('profileimage').upload(fileName, {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: fileName,
      });
      if (error) throw error;
      // Get public URL
      const { data: publicUrlData } = supabase.storage.from('profileimage').getPublicUrl(fileName);
      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error('Failed to get public URL');
      // Update user profile
      await supabase.from('users').update({ profilePicture: publicUrl }).eq('id', profile.id);
      setProfile({ ...profile, profilePicture: publicUrl });
      Alert.alert('Success', 'Profile picture updated!');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update profile picture.');
    } finally {
      setUploading(false);
    }
  };

  // Fetch and aggregate all stats from ball_by_ball for the user
  const fetchBallByBallStats = useCallback(async (userId: string) => {
    if (!userId) return;
    // Fetch all balls where user is batsman, bowler, or fielder
    const { data: balls, error } = await supabase
      .from('ball_by_ball')
      .select('*')
      .or(`batsman_id.eq.${userId},bowler_id.eq.${userId},fielder_id.eq.${userId}`);
    if (error) {
      Alert.alert('Error', 'Failed to fetch stats: ' + error.message);
      return;
    }
    // Batting stats
    const ballsBatted = balls.filter(b => b.batsman_id === userId);
    const matchesPlayed = new Set(ballsBatted.map(b => b.match_id)).size;
    const totalRuns = ballsBatted.reduce((sum, b) => sum + (b.runs || 0), 0);
    const ballsFaced = ballsBatted.length;
    const fours = ballsBatted.filter(b => b.runs === 4).length;
    const sixes = ballsBatted.filter(b => b.runs === 6).length;
    // Group by match for highest score, centuries, fifties
    const runsPerMatch: Record<string, number> = {};
    ballsBatted.forEach(b => {
      runsPerMatch[b.match_id] = (runsPerMatch[b.match_id] || 0) + (b.runs || 0);
    });
    const highestScore = Object.values(runsPerMatch).length > 0 ? Math.max(...Object.values(runsPerMatch)) : 0;
    const centuries = Object.values(runsPerMatch).filter(runs => runs >= 100).length;
    const halfCenturies = Object.values(runsPerMatch).filter(runs => runs >= 50 && runs < 100).length;
    // Dismissals (outs)
    const outs = ballsBatted.filter(b => b.dismissal && b.dismissal.batsman_id === userId).length;
    const battingAverage = outs ? (totalRuns / outs) : totalRuns;
    const strikeRate = ballsFaced ? (totalRuns / ballsFaced) * 100 : 0;
    // Bowling stats
    const ballsBowled = balls.filter(b => b.bowler_id === userId);
    const runsConceded = ballsBowled.reduce((sum, b) => sum + (b.runs || 0) + (b.extras || 0), 0);
    const wickets = ballsBowled.filter(b => b.wicket).length;
    const oversBowled = ballsBowled.length / 6;
    const bowlingAverage = wickets ? (runsConceded / wickets) : 0;
    const economyRate = oversBowled > 0 ? (runsConceded / oversBowled) : 0;
    // Best bowling (max wickets in a match)
    const wicketsPerMatch: Record<string, number> = {};
    ballsBowled.forEach(b => {
      if (b.wicket) {
        wicketsPerMatch[b.match_id] = (wicketsPerMatch[b.match_id] || 0) + 1;
      }
    });
    const bestBowlingWickets = Object.values(wicketsPerMatch).length > 0 ? Math.max(...Object.values(wicketsPerMatch)) : 0;
    // Catches
    const catches = balls.filter(b => b.fielder_id === userId && b.dismissal_type === 'catch').length;
    setBallStats({
      matchesPlayed,
      totalRuns,
      ballsFaced,
      fours,
      sixes,
      highestScore,
      centuries,
      halfCenturies,
      outs,
      battingAverage,
      strikeRate,
      runsConceded,
      wickets,
      oversBowled,
      bowlingAverage,
      economyRate,
      bestBowlingWickets,
      catches,
    });
  }, []);

  // Fetch ball_by_ball stats when viewedUserId changes
  useEffect(() => {
    if (viewedUserId) fetchBallByBallStats(viewedUserId);
  }, [viewedUserId, fetchBallByBallStats]);

  // Calculate advanced cricket stats
  const cricketStats: CricketStats = useMemo(() => {
    if (!profile) return {
      centuries: 0,
      halfCenturies: 0,
      highestScore: 0,
      bestBowling: '0/0',
      catches: 0,
      runOuts: 0,
      ducks: 0,
      sixes: 0,
      fours: 0,
    };

    const centuries = Math.floor(profile.totalRuns / 500);
    const halfCenturies = Math.floor(profile.totalRuns / 200);
    const highestScore = Math.min(profile.totalRuns > 0 ? Math.floor(profile.totalRuns / profile.matchesPlayed * 2) : 0, 200);
    const bestBowling = profile.totalWickets > 0 ? `${Math.min(profile.totalWickets, 6)}/${Math.floor(Math.random() * 30 + 10)}` : '0/0';
    
    return {
      centuries,
      halfCenturies,
      highestScore,
      bestBowling,
      catches: Math.floor(profile.matchesPlayed * 0.8),
      runOuts: Math.floor(profile.matchesPlayed * 0.2),
      ducks: Math.floor(profile.matchesPlayed * 0.1),
      sixes: Math.floor(profile.totalRuns / 6),
      fours: Math.floor(profile.totalRuns / 4),
    };
  }, [profile]);

  // Update achievements to use ballStats
  const achievements: Achievement[] = useMemo(() => {
    if (!ballStats) return [];
    const achievements: Achievement[] = [];
    if (ballStats.centuries > 0) {
      achievements.push({
        id: 'century',
        name: 'Century Maker',
        icon: 'emoji-events',
        description: `Scored ${ballStats.centuries} centuries`,
        dateEarned: new Date().toLocaleDateString(),
        rarity: 'epic'
      });
    }
    if (ballStats.wickets >= 50) {
      achievements.push({
        id: 'bowler',
        name: 'Wicket Taker',
        icon: 'whatshot',
        description: `Taken ${ballStats.wickets} wickets`,
        dateEarned: new Date().toLocaleDateString(),
        rarity: 'rare'
      });
    }
    if (ballStats.matchesPlayed >= 10) {
      achievements.push({
        id: 'veteran',
        name: 'Veteran Player',
        icon: 'star',
        description: `Played ${ballStats.matchesPlayed} matches`,
        dateEarned: new Date().toLocaleDateString(),
        rarity: 'common'
      });
    }
    if (ballStats.strikeRate > 120) {
      achievements.push({
        id: 'striker',
        name: 'Power Hitter',
        icon: 'flash-on',
        description: `Strike rate of ${ballStats.strikeRate.toFixed(1)}`,
        dateEarned: new Date().toLocaleDateString(),
        rarity: 'rare'
      });
    }
    if (ballStats.battingAverage > 40) {
      achievements.push({
        id: 'consistent',
        name: 'Consistent Batsman',
        icon: 'trending-up',
        description: `Batting average of ${ballStats.battingAverage.toFixed(1)}`,
        dateEarned: new Date().toLocaleDateString(),
        rarity: 'epic'
      });
    }
    return achievements;
  }, [ballStats]);

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / 86400000);
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const renderStatCard = (title: string, value: string | number, icon: string, color: string, subtitle?: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <MaterialIcons name={icon as any} size={24} color={color} />
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const renderAchievement = (achievement: Achievement) => {
    const rarityColors = {
      common: '#4CAF50',
      rare: '#2196F3',
      epic: '#9C27B0',
      legendary: '#FF9800'
    };

    return (
      <View key={achievement.id} style={[styles.achievementCard, { borderColor: rarityColors[achievement.rarity] }]}>
        <MaterialIcons name={achievement.icon as any} size={32} color={rarityColors[achievement.rarity]} />
        <View style={styles.achievementContent}>
          <Text style={styles.achievementName}>{achievement.name}</Text>
          <Text style={styles.achievementDescription}>{achievement.description}</Text>
          <Text style={styles.achievementDate}>{achievement.dateEarned}</Text>
        </View>
        <View style={[styles.rarityBadge, { backgroundColor: rarityColors[achievement.rarity] }]}>
          <Text style={styles.rarityText}>{achievement.rarity.toUpperCase()}</Text>
        </View>
      </View>
    );
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Text style={styles.postDate}>{formatTimeAgo(item.createdAt)}</Text>
        <View style={styles.postStats}>
          <Text style={styles.postStat}>❤️ {item.likes}</Text>
          <Text style={styles.postStat}>💬 {JSON.parse(item.comments || '[]').length}</Text>
        </View>
      </View>
      
      {item.text && <Text style={styles.postText}>{item.text}</Text>}
      
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="cover" />
      )}
      
      {item.location && (
        <View style={styles.postLocation}>
          <MaterialIcons name="location-on" size={14} color="#666" />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>
      )}
    </View>
  );

  const renderStatsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏏 Career Statistics</Text>
        <View style={styles.statsGrid}>
          {renderStatCard('Matches', ballStats?.matchesPlayed || 0, 'sports-cricket', '#4CAF50')}
          {renderStatCard('Total Runs', ballStats?.totalRuns || 0, 'trending-up', '#FF9800')}
          {renderStatCard('Wickets', ballStats?.wickets || 0, 'whatshot', '#F44336')}
          {renderStatCard('Batting Avg', ballStats?.battingAverage?.toFixed(2) || '0.00', 'bar-chart', '#2196F3')}
          {renderStatCard('Strike Rate', ballStats?.strikeRate?.toFixed(2) || '0.00', 'speed', '#9C27B0')}
          {renderStatCard('Bowl Avg', ballStats?.bowlingAverage?.toFixed(2) || '0.00', 'sports-baseball', '#607D8B')}
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Advanced Analytics</Text>
        <View style={styles.statsGrid}>
          {renderStatCard('Centuries', ballStats?.centuries || 0, 'emoji-events', '#FFD700', '100+ scores')}
          {renderStatCard('Half Centuries', ballStats?.halfCenturies || 0, 'star-half', '#FFC107', '50+ scores')}
          {renderStatCard('Highest Score', ballStats?.highestScore || 0, 'trending-up', '#4CAF50', 'Best innings')}
          {renderStatCard('Best Bowling', ballStats?.bestBowlingWickets || 0, 'whatshot', '#FF5722', 'Most wickets in match')}
          {renderStatCard('Catches', ballStats?.catches || 0, 'pan-tool', '#2196F3', 'Fielding')}
          {renderStatCard('Sixes', ballStats?.sixes || 0, 'sports-cricket', '#E91E63', 'Big hits')}
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Performance Insights</Text>
        <View style={styles.insightCard}>
          <MaterialIcons name="insights" size={24} color="#FFD700" />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Your Cricket Journey</Text>
            <Text style={styles.insightText}>
              {ballStats?.matchesPlayed === 0 
                ? "Ready to start your cricket journey! Join a match to begin tracking your stats."
                : `You've played ${ballStats?.matchesPlayed} matches and scored ${ballStats?.totalRuns} runs. ${
                    ballStats?.battingAverage > 30 
                      ? "Excellent batting consistency!" 
                      : "Keep practicing to improve your average!"
                  }`
              }
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderPostsTab = () => (
    <View style={styles.postsContainer}>
      <View style={styles.postsHeader}>
        <Text style={styles.sectionTitle}>📝 My Posts ({userPosts.length})</Text>
        <TouchableOpacity 
          style={styles.createPostButton}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <MaterialIcons name="add" size={20} color="#1B5E20" />
          <Text style={styles.createPostText}>New Post</Text>
        </TouchableOpacity>
      </View>
      
      {userPosts.length === 0 ? (
        <View style={styles.emptyPosts}>
          <MaterialIcons name="post-add" size={60} color="#FFD700" />
          <Text style={styles.emptyPostsTitle}>No posts yet!</Text>
          <Text style={styles.emptyPostsText}>Share your cricket moments with the community</Text>
          <TouchableOpacity 
            style={styles.firstPostButton}
            onPress={() => navigation.navigate('CreatePost')}
          >
            <Text style={styles.firstPostButtonText}>Create First Post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={userPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.postsList}
        />
      )}
    </View>
  );

  const renderAchievementsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 Achievements ({achievements.length})</Text>
        {achievements.length === 0 ? (
          <View style={styles.emptyAchievements}>
            <MaterialIcons name="emoji-events" size={60} color="#FFD700" />
            <Text style={styles.emptyAchievementsTitle}>No achievements yet!</Text>
            <Text style={styles.emptyAchievementsText}>Play matches to unlock achievements</Text>
          </View>
        ) : (
          <View style={styles.achievementsContainer}>
            {achievements.map(renderAchievement)}
          </View>
        )}
      </View>
    </ScrollView>
  );

  const handleFollow = async () => {
    try {
      await followUser(profile.id);
      setFollowing(true);
      setFollowersCount(c => c + 1);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleUnfollow = async () => {
    try {
      await unfollowUser(profile.id);
      setFollowing(false);
      setFollowersCount(c => Math.max(0, c - 1));
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#E8F5E8' }}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="person" size={60} color="#FFD700" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#E8F5E8' }}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={60} color="#FF5722" />
          <Text style={styles.errorText}>Profile not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchProfile(viewedUserId)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#E8F5E8' }}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FFD700']}
            tintColor="#FFD700"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.profileHeader}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={profile?.id === currentUserId ? handleProfilePicUpdate : undefined}
              activeOpacity={profile?.id === currentUserId ? 0.7 : 1}
            >
              {profile.profilePicture ? (
                <Image source={{ uri: profile.profilePicture }} style={styles.avatarImage} />
              ) : (
                <MaterialIcons name="person" size={60} color="#1B5E20" />
              )}
              {/* Edit icon overlay if own profile */}
              {profile?.id === currentUserId && (
                <View style={styles.editIconOverlay}>
                  <MaterialIcons name="edit" size={20} color="#FFD700" />
            </View>
              )}
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#FFD700" />
                </View>
              )}
            </TouchableOpacity>
            
            <Text style={styles.playerName}>{profile.name}</Text>
            
            <View style={styles.jerseyContainer}>
              <MaterialIcons name="sports" size={20} color="#FFD700" />
              <Text style={styles.jerseyNumber}>#{profile.jerseyNumber}</Text>
            </View>

            {/* Followers/Following and Follow/Unfollow button here */}
            <View style={styles.followRow}>
              <TouchableOpacity style={styles.followBlock}>
                <Text style={styles.followCount}>{followersCount}</Text>
                <Text style={styles.followLabel}>Followers</Text>
              </TouchableOpacity>
              <View style={styles.followDivider} />
              <TouchableOpacity style={styles.followBlock}>
                <Text style={styles.followCount}>{followingCount}</Text>
                <Text style={styles.followLabel}>Following</Text>
              </TouchableOpacity>
              {profile?.id && currentUserId && profile.id !== currentUserId && (
                following ? (
                  <TouchableOpacity onPress={handleUnfollow} style={styles.followBtnUnfollow}>
                    <Text style={styles.followBtnTextUnfollow}>Unfollow</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={handleFollow} style={styles.followBtnFollow}>
                    <Text style={styles.followBtnTextFollow}>Follow</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
            
            {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
            
            <View style={styles.profileStats}>
              <View style={styles.profileStat}>
                <Text style={styles.profileStatValue}>{userPosts.length}</Text>
                <Text style={styles.profileStatLabel}>Posts</Text>
              </View>
              <View style={styles.profileStat}>
                <Text style={styles.profileStatValue}>{ballStats?.matchesPlayed || 0}</Text>
                <Text style={styles.profileStatLabel}>Matches</Text>
              </View>
              <View style={styles.profileStat}>
                <Text style={styles.profileStatValue}>{achievements.length}</Text>
                <Text style={styles.profileStatLabel}>Achievements</Text>
              </View>
            </View>

            {/* Edit Profile Button - only for own profile */}
            {profile?.id && currentUserId && profile.id === currentUserId && (
              <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate('EditProfile')}>
                <MaterialIcons name="edit" size={20} color="#1B5E20" />
                <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            )}
          </View>

          <View style={styles.tabContainer}>
            {[
              { key: 'stats', label: 'Stats', icon: 'bar-chart' },
              { key: 'posts', label: 'Posts', icon: 'article' },
              { key: 'achievements', label: 'Achievements', icon: 'emoji-events' }
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

          <View style={styles.tabContent}>
            {selectedTab === 'stats' && renderStatsTab()}
            {selectedTab === 'posts' && renderPostsTab()}
            {selectedTab === 'achievements' && renderAchievementsTab()}
          </View>

          {/* Quick Actions section removed here */}

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <MaterialIcons name="logout" size={24} color="#FF5722" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF5722',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 16,
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#2E7D32',
  },
  avatarImage: {
    width: 94,
    height: 94,
    borderRadius: 47,
  },
  playerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  jerseyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginBottom: 12,
  },
  jerseyNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 4,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  profileStat: {
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  profileStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editProfileButtonText: {
    color: '#1B5E20',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
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
    color: '#FFD700',
    fontWeight: 'bold',
  },
  tabContent: {
    minHeight: 400,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statContent: {
    marginLeft: 12,
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: '#999',
    marginTop: 1,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  insightContent: {
    marginLeft: 12,
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  postsContainer: {
    flex: 1,
  },
  postsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  createPostText: {
    color: '#1B5E20',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 12,
  },
  emptyPosts: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyPostsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyPostsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  firstPostButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  firstPostButtonText: {
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  postsList: {
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  postDate: {
    fontSize: 12,
    color: '#666',
  },
  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  postStat: {
    fontSize: 12,
    color: '#666',
    marginLeft: 12,
  },
  postText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  postLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  achievementsContainer: {
    flexDirection: 'column',
  },
  achievementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginBottom: 12,
  },
  achievementContent: {
    marginLeft: 12,
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  achievementDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  rarityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  rarityText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyAchievements: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyAchievementsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyAchievementsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  actionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  actionText: {
    fontSize: 16,
    color: '#2E7D32',
    marginLeft: 12,
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  signOutText: {
    fontSize: 16,
    color: '#FF5722',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  profileBadgeCard: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFD700',
    marginBottom: 12,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEE',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  followRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  followBlock: {
    alignItems: 'center',
    marginHorizontal: 15,
  },
  followCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  followLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  followDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#E0E0E0',
  },
  followBtnFollow: {
    backgroundColor: '#FFD700',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  followBtnTextFollow: {
    color: '#1B5E20',
    fontWeight: 'bold',
    fontSize: 12,
  },
  followBtnUnfollow: {
    backgroundColor: '#eee',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  followBtnTextUnfollow: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 12,
  },
  editIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
  },
});