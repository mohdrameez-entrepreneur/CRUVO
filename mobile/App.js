import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, HankenGrotesk_400Regular, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold, HankenGrotesk_800ExtraBold } from '@expo-google-fonts/hanken-grotesk';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function WarmupToast() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(true);
  const opacity = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toast, { opacity, top: insets.top + 12 }]}>
      <View style={styles.toastIcon}>
        <Ionicons name="cloud-upload-outline" size={18} color={colors.primaryContainer} />
      </View>
      <View style={styles.toastTextWrap}>
        <Text style={styles.toastTitle}>Warming up server</Text>
        <Text style={styles.toastSub}>First load may take a few seconds</Text>
      </View>
    </Animated.View>
  );
}

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
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" backgroundColor={colors.background} />
        <AppNavigator />
        <WarmupToast />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(30,31,35,0.95)', borderWidth: 1, borderColor: 'rgba(255,214,0,0.3)',
    borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  toastIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,214,0,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  toastTextWrap: { flex: 1 },
  toastTitle: { color: colors.primaryContainer, fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14 },
  toastSub: { color: colors.onSurfaceVariant, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
});
