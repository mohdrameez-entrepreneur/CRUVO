import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, moderateScale } from '../theme';
import { ridesAPI } from '../api';
import NavBar from '../components/NavBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MapScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeRide, setActiveRide] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkForActiveRide();
  }, []);

  const checkForActiveRide = async () => {
    try {
      const res = await ridesAPI.list();
      const rides = res.data;
      const active = rides.find(r => r.status === 'ACTIVE');
      if (active) {
        setActiveRide(active);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <NavBar title="LIVE RADAR" subtitle="ACTIVE RIDE TRACKING" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primaryContainer} />
          <Text style={styles.loadingText}>Checking for active rides...</Text>
        </View>
      </View>
    );
  }

  if (activeRide) {
    navigation.replace('ActiveRide', { rideId: activeRide.id });
    return null;
  }

  return (
    <View style={styles.container}>
      <NavBar title="LIVE RADAR" subtitle="ACTIVE RIDE TRACKING" />
      <View style={[styles.centerContent, { paddingBottom: Math.max(insets.bottom, 16) + 90 }]}>
        <View style={styles.iconContainer}>
          <Ionicons name="map-outline" size={56} color={colors.primaryContainer} />
        </View>
        <Text style={styles.title}>No Active Ride</Text>
        <Text style={styles.subtitle}>Start a ride to see live tracking on the map</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color={colors.onPrimaryContainer} />
          <Text style={styles.createButtonText}>Create a Ride</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContent: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, gap: spacing.stackMd,
  },
  iconContainer: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.25)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.stackSm,
  },
  title: { ...typography.headlineLgMobile, color: colors.onSurface },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },
  loadingText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.stackSm },
  createButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm,
    backgroundColor: colors.primaryContainer, paddingHorizontal: spacing.stackLg,
    paddingVertical: spacing.stackMd, borderRadius: borderRadius.lg, marginTop: spacing.stackMd,
  },
  createButtonText: { ...typography.titleMd, color: colors.onPrimaryContainer, textTransform: 'uppercase' },
});
