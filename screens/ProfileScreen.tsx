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

const createDefaultProfile = useCallback(async () => {
  try {
    const createdProfile = await db?.from('users').add(defaultProfile);
    if (createdProfile) {
      setProfile(createdProfile as UserProfile);
      console.log('✅ Default profile created');
    }
  } catch (error) {
    console.error('❌ Error creating default profile:', error);
  }
}, [db, defaultProfile]);

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
