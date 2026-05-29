import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@hooks/useAuth';
import { useEateryStore } from '@store/eateryStore';
import { useNotifications } from '@hooks/useNotifications';
import { Colors } from '@constants/colors';
import { Analytics } from '@lib/analytics';
import { initialiseSentry } from '@lib/errorReporting';
import { ErrorBoundary } from '@components/common/ErrorBoundary';

// Initialise Sentry as early as possible (before any component renders)
initialiseSentry();

import { HomeScreen }         from '@screens/HomeScreen';
import { MapScreen }          from '@screens/MapScreen';
import { OnboardingScreen }   from '@screens/OnboardingScreen';
import { FavouritesScreen }   from '@screens/FavouritesScreen';
import { HistoryScreen }      from '@screens/HistoryScreen';
import { ProfileScreen }      from '@screens/ProfileScreen';
import { AuthScreen }         from '@screens/AuthScreen';
import { ReportScreen }       from '@screens/ReportScreen';
import { EateryDetailScreen } from '@screens/EateryDetailScreen';
import { AddEateryScreen }       from '@screens/AddEateryScreen';
import { ForumScreen }           from '@screens/ForumScreen';
import { NewForumPostScreen }    from '@screens/NewForumPostScreen';
import { GoProScreen }           from '@screens/GoProScreen';
import { WriteReviewScreen }     from '@screens/WriteReviewScreen';
import { AdminScreen }           from '@screens/AdminScreen';
import { SettingsScreen }        from '@screens/SettingsScreen';
import { LeaderboardScreen }     from '@screens/LeaderboardScreen';
import { LoadingSpinner }     from '@components/common/LoadingSpinner';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs() {
  const { user } = useAuth();
  useNotifications(user?.id, user?.streak_days);
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
      <Tab.Screen name="Home"       component={HomeScreen}       options={{ tabBarLabel: 'Home',    tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text> }} />
      <Tab.Screen name="Map"        component={MapScreen}        options={{ tabBarLabel: 'Map',     tabBarIcon: () => <Text style={{ fontSize: 20 }}>🗺️</Text> }} />
      <Tab.Screen name="Favourites" component={FavouritesScreen} options={{ tabBarLabel: 'Saved',   tabBarIcon: () => <Text style={{ fontSize: 20 }}>⭐</Text> }} />
      <Tab.Screen name="History"    component={HistoryScreen}    options={{ tabBarLabel: 'History', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🕐</Text> }} />
      <Tab.Screen name="Forum"      component={ForumScreen}      options={{ tabBarLabel: 'Forum',   tabBarIcon: () => <Text style={{ fontSize: 20 }}>💬</Text> }} />
      <Tab.Screen name="Profile"    component={ProfileScreen}    options={{ tabBarLabel: 'Profile', tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { isLoading } = useAuth();
  const { loadFavourites } = useEateryStore();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const routeNameRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Load persisted favourites and onboarding state on startup
    AsyncStorage.getItem('onboarding_done').then(val => setOnboardingDone(val === 'true'));
    loadFavourites();
    Analytics.track('app_open');
  }, []);

  if (isLoading || onboardingDone === null) return <LoadingSpinner />;

  return (
    <ErrorBoundary>
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
        }}
        onStateChange={() => {
          const current = navigationRef.current?.getCurrentRoute()?.name;
          if (current && current !== routeNameRef.current) {
            Analytics.track('screen_view', { screen: current });
            routeNameRef.current = current;
          }
        }}
      >
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={onboardingDone ? 'Main' : 'Onboarding'}
        >
          <Stack.Screen name="Onboarding"   component={OnboardingScreen} />
          <Stack.Screen name="Main"         component={MainTabs} />
          <Stack.Screen name="Auth"         component={AuthScreen}         options={{ presentation: 'modal' }} />
          <Stack.Screen name="ReportQueue"  component={ReportScreen}       options={{ presentation: 'modal' }} />
          <Stack.Screen name="EateryDetail" component={EateryDetailScreen} />
          <Stack.Screen name="AddEatery"      component={AddEateryScreen}      options={{ presentation: 'modal' }} />
          <Stack.Screen name="NewForumPost"  component={NewForumPostScreen}   options={{ presentation: 'modal' }} />
          <Stack.Screen name="GoPro"         component={GoProScreen}          options={{ presentation: 'modal' }} />
          <Stack.Screen name="WriteReview"   component={WriteReviewScreen}    options={{ presentation: 'modal' }} />
          <Stack.Screen name="Admin"         component={AdminScreen} />
          <Stack.Screen name="Settings"      component={SettingsScreen} />
          <Stack.Screen name="Leaderboard"   component={LeaderboardScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}
