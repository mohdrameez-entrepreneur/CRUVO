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
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import WhatsNewModal from '../components/WhatsNewModal';
import UpdateRequiredModal from '../components/UpdateRequiredModal';
import PsychologicalLoadingScreen from '../components/PsychologicalLoadingScreen';
import MainTabs from './MainTabs';
import { versionAPI } from '../api';
import { CURRENT_APP_VERSION } from '../config';

const Stack = createNativeStackNavigator();

function parseVersion(v) {
  if (!v) return [0, 0, 0];
  return v.split('.').map(n => parseInt(n, 10) || 0);
}

function isVersionOutdated(current, minRequired) {
  const c = parseVersion(current);
  const r = parseVersion(minRequired);
  for (let i = 0; i < 3; i++) {
    if (c[i] < r[i]) return true;
    if (c[i] > r[i]) return false;
  }
  return false;
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [hasAgreedPolicy, setHasAgreedPolicy] = useState(null);
  const [updateRequiredData, setUpdateRequiredData] = useState(null);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [whatsNewList, setWhatsNewList] = useState([]);
  const [isWarmupComplete, setIsWarmupComplete] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync('has_agreed_privacy_policy')
      .then(val => {
        setHasAgreedPolicy(val === 'true');
      })
      .catch(() => {
        setHasAgreedPolicy(false);
      });
  }, []);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await versionAPI.getAppVersion();
        const data = res.data;
        if (data.whats_new) {
          setWhatsNewList(data.whats_new);
        }

        const isMandatory = isVersionOutdated(CURRENT_APP_VERSION, data.min_required_version);
        const isOutdated = isVersionOutdated(CURRENT_APP_VERSION, data.latest_version);

        if (isMandatory) {
          setUpdateRequiredData({ ...data, isMandatory: true });
        } else if (isOutdated) {
          setUpdateRequiredData({ ...data, isMandatory: false });
        } else if (user) {
          const seenKey = `seen_whats_new_v${CURRENT_APP_VERSION}`;
          const seen = await SecureStore.getItemAsync(seenKey);
          if (!seen) {
            setShowWhatsNew(true);
          }
        }
      } catch (err) {
        console.log('[VersionCheck] Notice:', err.message);
      }
    };

    checkVersion();
  }, [user]);

  const handleDismissWhatsNew = async () => {
    setShowWhatsNew(false);
    try {
      await SecureStore.setItemAsync(`seen_whats_new_v${CURRENT_APP_VERSION}`, 'true');
    } catch {}
  };

  if (!isWarmupComplete || loading || hasAgreedPolicy === null) {
    return <PsychologicalLoadingScreen onFinish={() => setIsWarmupComplete(true)} />;
  }

  if (updateRequiredData && updateRequiredData.isMandatory) {
    return (
      <UpdateRequiredModal
        visible
        currentVersion={CURRENT_APP_VERSION}
        latestVersion={updateRequiredData.latest_version || '3.1.0'}
        requiredVersion={updateRequiredData.min_required_version || '3.0.0'}
        whatsNew={updateRequiredData.whats_new}
        playStoreUrl={updateRequiredData.play_store_url}
        webStoreUrl={updateRequiredData.web_store_url}
        websiteUrl={updateRequiredData.website_url}
        isMandatory={true}
      />
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
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
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

      <WhatsNewModal
        visible={showWhatsNew}
        version={CURRENT_APP_VERSION}
        whatsNewList={whatsNewList.length > 0 ? whatsNewList : undefined}
        onClose={handleDismissWhatsNew}
      />

      <UpdateRequiredModal
        visible={!!updateRequiredData && !updateRequiredData.isMandatory}
        currentVersion={CURRENT_APP_VERSION}
        latestVersion={updateRequiredData?.latest_version || '3.1.0'}
        requiredVersion={updateRequiredData?.min_required_version || '3.0.0'}
        whatsNew={updateRequiredData?.whats_new}
        playStoreUrl={updateRequiredData?.play_store_url}
        webStoreUrl={updateRequiredData?.web_store_url}
        websiteUrl={updateRequiredData?.website_url}
        isMandatory={false}
        onDismiss={() => setUpdateRequiredData(null)}
      />
    </NavigationContainer>
  );
}
