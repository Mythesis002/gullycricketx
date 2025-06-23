import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BasicProvider, useBasic } from '@basictech/expo';
import { MaterialIcons } from '@expo/vector-icons';
import { View, Text } from 'react-native';

import { schema } from './basic.config';
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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Feed') {
            iconName = 'home';
          } else if (route.name === 'Teams') {
            iconName = 'group';
          } else if (route.name === 'Matches') {
            iconName = 'sports-cricket';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          } else if (route.name === 'Notifications') {
            iconName = 'notifications';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: '#666',
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
        options={{ title: 'GullyCricketX' }}
      />
      <Tab.Screen 
        name="Teams" 
        component={TeamsScreen} 
        options={{ title: 'Teams' }}
      />
      <Tab.Screen 
        name="Matches" 
        component={MatchesScreen} 
        options={{ title: 'Matches' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'Profile' }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ title: 'Notifications' }}
      />
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2E7D32',
        },
        headerTintColor: '#FFD700',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreatePost" 
        component={CreatePostScreen} 
        options={{ title: 'Create Post' }}
      />
      <Stack.Screen 
        name="CreateTeam" 
        component={CreateTeamScreen} 
        options={{ title: 'Create Team' }}
      />
      <Stack.Screen 
        name="CreateMatch" 
        component={CreateMatchScreen} 
        options={{ title: 'Schedule Match' }}
      />
      <Stack.Screen 
        name="MatchDetail" 
        component={MatchDetailScreen} 
        options={{ title: 'Match Details' }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen} 
        options={{ title: 'Match Chat' }}
      />
      <Stack.Screen 
        name="Analytics" 
        component={AnalyticsScreen} 
        options={{ title: 'Match Analytics' }}
      />
      <Stack.Screen 
        name="Tournament" 
        component={TournamentScreen} 
        options={{ title: 'Tournaments' }}
      />
      <Stack.Screen 
        name="Leaderboard" 
        component={LeaderboardScreen} 
        options={{ title: 'Leaderboard' }}
      />
      <Stack.Screen 
        name="CoinToss" 
        component={CoinTossScreen} 
        options={{ title: 'Coin Toss' }}
      />
    </Stack.Navigator>
  );
}

function AppContent() {
  const { isSignedIn, user, isLoading } = useBasic();

  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#1B5E20' 
      }}>
        <MaterialIcons name="sports-cricket" size={60} color="#FFD700" />
        <Text style={{ 
          color: '#FFD700', 
          fontSize: 18, 
          marginTop: 16, 
          fontWeight: 'bold' 
        }}>
          Loading GullyCricketX...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isSignedIn && user ? <AppStack /> : <AuthScreen />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <BasicProvider project_id={schema.project_id} schema={schema}>
        <AppContent />
        <StatusBar style="light" />
      </BasicProvider>
    </SafeAreaProvider>
  );
}
