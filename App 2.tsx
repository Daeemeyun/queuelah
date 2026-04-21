import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@hooks/useAuth';
import { Colors } from '@constants/colors';

import { MapScreen }          from '@screens/MapScreen';
import { OnboardingScreen }   from '@screens/OnboardingScreen';
import { FavouritesScreen }   from '@screens/FavouritesScreen';
import { HistoryScreen }      from '@screens/HistoryScreen';
import { ProfileScreen }      from '@screens/ProfileScreen';
import { AuthScreen }         from '@screens/AuthScreen';
import { LoadingSpinner }     from '@components/common/LoadingSpinner';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          paddingBottom: 8,
          height: 60,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.subtext,
        tabBarLabelStyle: { fontSize: 10, marginBottom: 2 },
      }}
    >
      <Tab.Screen name="Map"        component={MapScreen}        options={{ tabBarLabel: 'Map',     tabBarIcon: () => <Text style={{ fontSize: 20 }}>🗺️</Text> }} />
      <Tab.Screen name="Favourites" component={FavouritesScreen} options={{ tabBarLabel: 'Saved',   tabBarIcon: () => <Text style={{ fontSize: 20 }}>⭐</Text> }} />
      <Tab.Screen name="History"    component={HistoryScreen}    options={{ tabBarLabel: 'History', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🕐</Text> }} />
      <Tab.Screen name="Profile"    component={ProfileScreen}    options={{ tabBarLabel: 'Profile', tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { isLoading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  // Wait for both auth and onboarding check
  if (isLoading || onboardingDone === null) return <LoadingSpinner />;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={onboardingDone ? 'Main' : 'Onboarding'}
        >
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Main"       component={MainTabs} />
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ presentation: 'modal' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
