import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { supabase } from './utils/supabaseClient';
import * as Linking from 'expo-linking';

import AuthScreen from './screens/AuthScreen';
import SocialFeedScreen from './screens/SocialFeedScreen';
import ProfileScreen from './screens/ProfileScreen';
import TeamsScreen from './screens/TeamsScreen';
import MatchesScreen from './screens/MatchesScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import CreatePostScreen from './screens/CreatePostScreen';
import CreateTeamScreen from './screens/CreateTeamScreen';
import CreateMatchScreen from './screens/CreateMatchScreen';
import MatchDetailScreen from './screens/MatchDetailScreen';
import ChatScreen from './screens/ChatScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import TournamentScreen from './screens/TournamentScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import CoinTossScreen from './screens/CoinTossScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import DebugScreen from './screens/DebugScreen';
import AllPlayersScreen from './screens/AllPlayersScreen';
import AppSummaryScreen from './screens/AppSummaryScreen';
import ScheduleMatchScreen from './screens/ScheduleMatchScreen';
import WaitingForApprovalScreen from './screens/WaitingForApprovalScreen';
import LiveMatchSummaryScreen from './screens/LiveMatchSummaryScreen';
import TournamentWizardScreen from './screens/TournamentWizardScreen';
import TournamentDetailScreen from './screens/TournamentDetailScreen';
import LiveScoringScreen from './screens/LiveScoringScreen';
import ScorecardScreen from './screens/ScorecardScreen';
import PlayerSearchScreen from './screens/PlayerSearchScreen';
import TeamsStack from './screens/TeamsStack';

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home';
          if (route.name === 'Feed') iconName = 'home';
          else if (route.name === 'Teams') iconName = 'group';
          else if (route.name === 'Matches') iconName = 'sports-cricket';
          else if (route.name === 'Profile') iconName = 'person';
          else if (route.name === 'Notifications') iconName = 'notifications';
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarStyle: {
          backgroundColor: '#2E7D32',
          borderTopWidth: 0,
          elevation: 8,
          shadowOpacity: 0.1,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -2 },
        },
        headerStyle: {
          backgroundColor: '#2E7D32',
        },
        headerTintColor: '#FFD700',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      })}
    >
      <Tab.Screen 
        name="Feed" 
        component={SocialFeedScreen} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Teams" 
        component={TeamsStack} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Matches" 
        component={MatchesScreen} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const linking = {
    prefixes: ['gullycricketx://', 'https://yourapp.com'],
    config: {
      screens: {
        MainTabs: '',
        TournamentWizard: {
          path: 'join/tournament/:tournamentId',
        },
        // ...other screens
      },
    },
  };
  return (
    <NavigationContainer linking={linking}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs" component={MainTabs} />
        <RootStack.Screen name="CreatePost" component={CreatePostScreen} options={{ headerShown: true, title: 'Create Post' }} />
        <RootStack.Screen name="CreateTeamScreen" component={CreateTeamScreen} options={{ headerShown: true, title: 'Create Team' }} />
        <RootStack.Screen name="ScheduleMatchScreen" component={ScheduleMatchScreen} options={{ headerShown: true, title: 'Schedule Match' }} />
        <RootStack.Screen name="CreateMatch" component={CreateMatchScreen} options={{ headerShown: true, title: 'Create Match' }} />
        <RootStack.Screen name="MatchDetail" component={MatchDetailScreen} options={{ headerShown: true, title: 'Match Details' }} />
        <RootStack.Screen name="LiveMatchSummaryScreen" component={LiveMatchSummaryScreen} options={{ headerShown: true, title: 'Match Summary' }} />
        <RootStack.Screen name="Chat" component={ChatScreen} options={{ headerShown: true, title: 'Match Chat' }} />
        <RootStack.Screen name="Analytics" component={AnalyticsScreen} options={{ headerShown: true, title: 'Match Analytics' }} />
        <RootStack.Screen name="Tournament" component={TournamentScreen} options={{ headerShown: true, title: 'Tournaments' }} />
        <RootStack.Screen name="TournamentWizard" component={TournamentWizardScreen} options={{ headerShown: true, title: 'Tournament Wizard' }} />
        <RootStack.Screen name="TournamentDetail" component={TournamentDetailScreen} options={{ headerShown: true, title: 'Tournament Details' }} />
        <RootStack.Screen name="LiveScoring" component={LiveScoringScreen} options={{ headerShown: true, title: 'Live Scoring' }} />
        <RootStack.Screen name="Scorecard" component={ScorecardScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ headerShown: true, title: 'Leaderboard' }} />
        <RootStack.Screen name="CoinTossScreen" component={CoinTossScreen} options={{ headerShown: true, title: 'Coin Toss' }} />
        <RootStack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: true, title: 'Edit Profile' }} />
        <RootStack.Screen name="AllPlayers" component={AllPlayersScreen} options={{ headerShown: true, title: 'All Players' }} />
        <RootStack.Screen name="AppSummary" component={AppSummaryScreen} options={{ headerShown: true, title: 'App Overview' }} />
        <RootStack.Screen name="Debug" component={DebugScreen} options={{ headerShown: true, title: 'Debug Info' }} />
        <RootStack.Screen name="ProfileSetup" component={ProfileSetupScreen} options={{ headerShown: true, title: 'Profile Setup' }} />
        <RootStack.Screen name="ProfileScreen" component={ProfileScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="WaitingForApprovalScreen" component={WaitingForApprovalScreen} />
        <RootStack.Screen name="PlayerSearchScreen" component={PlayerSearchScreen} options={{ headerShown: true, title: 'Player Search' }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  if (loading) return null; // Or a splash/loading screen

  // If not logged in, show AuthScreen
  if (!session) {
    return (
      <SafeAreaProvider>
        <AuthScreen />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  // If logged in, show main app
  return (
    <SafeAreaProvider>
        <AppContent />
        <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
