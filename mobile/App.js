import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts, HankenGrotesk_400Regular, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold, HankenGrotesk_800ExtraBold } from '@expo-google-fonts/hanken-grotesk';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
    JetBrainsMono_500Medium,
  });

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor={colors.background} />
      <AppNavigator />
    </AuthProvider>
  );
}
