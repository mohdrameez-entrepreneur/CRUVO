import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../theme';

import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import DiscoveryScreen from '../screens/DiscoveryScreen';
import CreateRideScreen from '../screens/CreateRideScreen';
import ActiveRideScreen from '../screens/ActiveRideScreen';
import FlagStopScreen from '../screens/FlagStopScreen';
import RideSummaryScreen from '../screens/RideSummaryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import InviteRidersScreen from '../screens/InviteRidersScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [hasAgreedPolicy, setHasAgreedPolicy] = useState(null);

  useEffect(() => {
    SecureStore.getItemAsync('has_agreed_privacy_policy')
      .then(val => {
        setHasAgreedPolicy(val === 'true');
      })
      .catch(() => {
        setHasAgreedPolicy(false);
      });
  }, []);

  if (loading || hasAgreedPolicy === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primaryContainer} />
      </View>
    );
  }

  if (!hasAgreedPolicy) {
    return (
      <PrivacyPolicyScreen
        onAgree={() => setHasAgreedPolicy(true)}
      />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 220,
          gestureEnabled: true,
          animationTypeForReplace: 'push',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="CreateRide" component={CreateRideScreen} />
            <Stack.Screen name="Discovery" component={DiscoveryScreen} />
            <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
            <Stack.Screen name="FlagStop" component={FlagStopScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="RideSummary" component={RideSummaryScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
            <Stack.Screen name="InviteRiders" component={InviteRidersScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
