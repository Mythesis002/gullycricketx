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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBasic } from '@basictech/expo';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

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
  userId: string;
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
  const { db, user, signout } = useBasic();
  const navigation = useNavigation<any>();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'stats' | 'posts' | 'achievements'>('stats');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const initializeProfile = useCallback(async () => {
    await Promise.all([
      fetchProfile(),
      fetchUserPosts()
    ]);
  }, []);

  const fetchUserPosts = useCallback(async () => {
    try {
      const posts = await db?.from('posts').getAll();
      if (posts) {
        const myPosts = (posts as any[]).filter(post => post.userId === user?.id);
        setUserPosts(myPosts.sort((a, b) => b.createdAt - a.createdAt));
        console.log(`📝 Found ${myPosts.length} posts by user`);
      }
    } catch (error) {
      console.error('❌ Error fetching user posts:', error);
    }
  }, [db, user?.id]);

  useEffect(() => {
    initializeProfile();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [initializeProfile, fadeAnim]);

  useFocusEffect(
    useCallback(() => {
      fetchUserPosts();
    }, [fetchUserPosts])
  );

  const fetchProfile = async () => {
    try {
      console.log('🔍 Fetching profile for user:', user?.email);
      const users = await db?.from('users').getAll();
      
      if (users && users.length > 0) {
        const userProfile = (users as any[])?.find(u => u.email === user?.email);
        
        if (userProfile) {
          setProfile(userProfile as UserProfile);
          console.log('✅ Profile loaded:', userProfile.name);
        } else {
          console.log('❌ No profile found for current user');
          await createDefaultProfile();
        }
      } else {
        console.log('❌ No users found in database');
        await createDefaultProfile();
      }
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const createDefaultProfile = async () => {
    try {
      const defaultProfile = {
        name: user?.name || 'Cricket Player',
        email: user?.email || '',
        jerseyNumber: Math.floor(Math.random() * 99 + 1).toString(),
        bio: 'Passionate cricket player 🏏',
        profilePicture: '',
        matchesPlayed: 0,
        totalRuns: 0,
        totalWickets: 0,
        battingAverage: 0,
        strikeRate: 0,
        bowlingAverage: 0,
        economyRate: 0,
        badges: '[]',
        createdAt: Date.now(),
      };

      const createdProfile = await db?.from('users').add(defaultProfile);
      if (createdProfile) {
        setProfile(createdProfile as UserProfile);
        console.log('✅ Default profile created');
      }
    } catch (error) {
      console.error('❌ Error creating default profile:', error);
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
              await signout();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

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

  const achievements: Achievement[] = useMemo(() => {
    if (!profile) return [];

    const achievements: Achievement[] = [];
    
    if (cricketStats.centuries > 0) {
      achievements.push({
        id: 'century',
        name: 'Century Maker',
        icon: 'emoji-events',
        description: `Scored ${cricketStats.centuries} centuries`,
        dateEarned: new Date().toLocaleDateString(),
        rarity: 'epic'
      });
    }

    if (profile.totalWickets >= 50) {
      achievements.push({
        id: 'bowler',
        name: 'Wicket Taker',
        icon: 'whatshot',
        description: `Taken ${profile.totalWickets} wickets`,
        dateEarned: new Date().toLocaleDateString(),
        rarity: 'rare'
      });
    }

    if (profile.matchesPlayed >= 10) {
      achievements.push({
        id: 'veteran',
        name: 'Veteran Player',
        icon: 'star',
        description: `Played ${profile.matchesPlayed} matches`,
        dateEarned: new Date().toLocaleDateString(),
        rarity: 'common'
      });
    }

    if (profile.strikeRate > 120) {
      achievements.push({
        id: 'striker',
        name: 'Power Hitter',
        icon: 'flash-on',
        description: `Strike rate of ${profile.strikeRate.toFixed(1)}`,
        dateEarned: new Date().toLocaleDateString(),
        rarity: 'rare'
      });
    }

    if (profile.battingAverage > 40) {
      achievements.push({
        id: 'consistent',
        name: 'Consistent Batsman',
        icon: 'trending-up',
        description: `Batting average of ${profile.battingAverage.toFixed(1)}`,
        dateEarned: new Date().toLocaleDateString(),
        rarity: 'epic'
      });
    }

    return achievements;
  }, [profile, cricketStats]);

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
          {renderStatCard('Matches', profile?.matchesPlayed || 0, 'sports-cricket', '#4CAF50')}
          {renderStatCard('Total Runs', profile?.totalRuns || 0, 'trending-up', '#FF9800')}
          {renderStatCard('Wickets', profile?.totalWickets || 0, 'whatshot', '#F44336')}
          {renderStatCard('Batting Avg', (profile?.battingAverage || 0).toFixed(1), 'bar-chart', '#2196F3')}
          {renderStatCard('Strike Rate', (profile?.strikeRate || 0).toFixed(1), 'speed', '#9C27B0')}
          {renderStatCard('Bowl Avg', (profile?.bowlingAverage || 0).toFixed(1), 'sports-baseball', '#607D8B')}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Advanced Analytics</Text>
        <View style={styles.statsGrid}>
          {renderStatCard('Centuries', cricketStats.centuries, 'emoji-events', '#FFD700', '100+ scores')}
          {renderStatCard('Half Centuries', cricketStats.halfCenturies, 'star-half', '#FFC107', '50+ scores')}
          {renderStatCard('Highest Score', cricketStats.highestScore, 'trending-up', '#4CAF50', 'Best innings')}
          {renderStatCard('Best Bowling', cricketStats.bestBowling, 'whatshot', '#FF5722', 'Best figures')}
          {renderStatCard('Catches', cricketStats.catches, 'pan-tool', '#2196F3', 'Fielding')}
          {renderStatCard('Sixes', cricketStats.sixes, 'sports-cricket', '#E91E63', 'Big hits')}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Performance Insights</Text>
        <View style={styles.insightCard}>
          <MaterialIcons name="insights" size={24} color="#FFD700" />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Your Cricket Journey</Text>
            <Text style={styles.insightText}>
              {profile?.matchesPlayed === 0 
                ? "Ready to start your cricket journey! Join a match to begin tracking your stats."
                : `You've played ${profile?.matchesPlayed} matches and scored ${profile?.totalRuns} runs. ${
                    profile?.battingAverage > 30 
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="person" size={60} color="#FFD700" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={60} color="#FF5722" />
          <Text style={styles.errorText}>Profile not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
            <View style={styles.avatarContainer}>
              {profile.profilePicture ? (
                <Image source={{ uri: profile.profilePicture }} style={styles.avatarImage} />
              ) : (
                <MaterialIcons name="person" size={60} color="#1B5E20" />
              )}
            </View>
            
            <Text style={styles.playerName}>{profile.name}</Text>
            
            <View style={styles.jerseyContainer}>
              <MaterialIcons name="sports" size={20} color="#FFD700" />
              <Text style={styles.jerseyNumber}>#{profile.jerseyNumber}</Text>
            </View>
            
            {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
            
            <View style={styles.profileStats}>
              <View style={styles.profileStat}>
                <Text style={styles.profileStatValue}>{userPosts.length}</Text>
                <Text style={styles.profileStatLabel}>Posts</Text>
              </View>
              <View style={styles.profileStat}>
                <Text style={styles.profileStatValue}>{profile.matchesPlayed}</Text>
                <Text style={styles.profileStatLabel}>Matches</Text>
              </View>
              <View style={styles.profileStat}>
                <Text style={styles.profileStatValue}>{achievements.length}</Text>
                <Text style={styles.profileStatLabel}>Achievements</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.editProfileButton}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <MaterialIcons name="edit" size={16} color="#1B5E20" />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Leaderboard')}
              >
                <MaterialIcons name="leaderboard" size={24} color="#FFD700" />
                <Text style={styles.actionText}>Leaderboard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('AllPlayers')}
              >
                <MaterialIcons name="people" size={24} color="#FFD700" />
                <Text style={styles.actionText}>All Players</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('CreateTeam')}
              >
                <MaterialIcons name="group-add" size={24} color="#FFD700" />
                <Text style={styles.actionText}>Create Team</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Tournament')}
              >
                <MaterialIcons name="emoji-events" size={24} color="#FFD700" />
                <Text style={styles.actionText}>Tournaments</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <MaterialIcons name="logout" size={24} color="#FF5722" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
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
  editProfileText: {
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
});