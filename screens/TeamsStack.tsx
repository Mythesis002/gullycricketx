import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TeamsScreen from './TeamsScreen';
import CreateTeamScreen from './CreateTeamScreen';
import { TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const Stack = createStackNavigator();

export default function TeamsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#2E7D32' },
        headerTintColor: '#FFD700',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
      }}
    >
      <Stack.Screen name="TeamsScreen" component={TeamsScreen} options={{ headerShown: false }} />
      <Stack.Screen 
        name="CreateTeamScreen" 
        component={CreateTeamScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
} 