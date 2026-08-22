import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, scale, moderateScale } from '../theme';
import { useAuth } from '../context/AuthContext';
import { ridesAPI } from '../api';
import NavBar from '../components/NavBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function getGreeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function Avatar({ profile, size = 64 }) {
  if (profile?.avatar_url) {
    return (
      <View style={[styles.avatarContainer, { width: size, height: size }]}>
        <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
      </View>
    );
  }
  return (
    <View style={[styles.avatarContainer, styles.avatarFallback, { width: size, height: size }]}>
      <Text style={styles.avatarInitials}>{profile?.initials || '??'}</Text>
    </View>
  );
}

function RideCard({ ride }) {
  const dateStr = new Date(ride.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  const timeStr = new Date(`2000-01-01T${ride.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={styles.rideCard}>
      <View style={styles.rideCardGrid} />
      <View style={styles.rideCardHeader}>
        <View style={styles.rideCardInfo}>
          <Text style={styles.rideCardTime}>{timeStr} • {dateStr}</Text>
          <Text style={styles.rideCardName}>{ride.name}</Text>
        </View>
        <View style={styles.rideStatusBadge}>
          <Text style={styles.rideStatusText}>{ride.status}</Text>
        </View>
      </View>
      <View style={styles.rideCardDetails}>
        <View style={styles.rideDetailRow}>
          <Ionicons name="people" size={18} color={colors.onSurfaceVariant} />
          <Text style={styles.rideDetailText}>{ride.participant_count} riders</Text>
          {ride.distance_km && (
            <>
              <Ionicons name="navigate" size={18} color={colors.onSurfaceVariant} style={{ marginLeft: spacing.stackMd }} />
              <Text style={styles.rideDetailText}>{ride.distance_km} km</Text>
            </>
          )}
        </View>
        <View style={styles.rideRoute}>
          <Ionicons name="navigate-circle-outline" size={16} color={colors.primaryContainer} />
          <Text style={styles.rideRouteText} numberOfLines={1} ellipsizeMode="tail">
            {ride.origin_name || 'Origin'} → {ride.destination_name || 'Destination'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [rides, setRides] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadRides = async () => {
    try {
      const res = await ridesAPI.list();
      setRides(res.data);
    } catch {}
  };

  useEffect(() => { loadRides(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRides();
    setRefreshing(false);
  };

  const hour = new Date().getHours();
  const greeting = getGreeting(hour);

  return (
    <View style={styles.container}>
      <NavBar
        title="CRUVO"
        leftAction={
          <TouchableOpacity
            style={styles.navProfileBtn}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle-outline" size={24} color={colors.primaryContainer} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 110 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryContainer} />}
      >
        <View style={styles.greetingSection}>
          <Avatar profile={profile} />
          <View style={styles.greetingText}>
            <Text style={styles.greetingName}>{greeting}, {profile?.display_name || 'Rider'}</Text>
            <View style={styles.greetingSubtitle}>
              <View style={styles.statusDot} />
              <Text style={styles.greetingReady}>Ready for a ride?</Text>
            </View>
          </View>
        </View>

        <View style={styles.ctaGrid}>
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={() => navigation.navigate('CreateRide')}
            activeOpacity={0.8}
          >
            <View style={styles.ctaIconContainer}>
              <Ionicons name="navigate" size={32} color={colors.primaryContainer} />
            </View>
            <View>
              <Text style={styles.ctaTitle}>CREATE A RIDE</Text>
              <Text style={styles.ctaSubtitle}>Plan a route and invite crew</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryCta}
            onPress={() => navigation.navigate('Discovery')}
            activeOpacity={0.8}
          >
            <Ionicons name="people-outline" size={24} color={colors.onSurface} />
            <Text style={styles.ctaSecondaryText}>JOIN A RIDE</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ridesSection}>
          <View style={styles.ridesSectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Rides</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Rides' })}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {rides.length > 0 ? (
            rides.map(ride => (
              <TouchableOpacity key={ride.id} onPress={() => {
                if (ride.status === 'ACTIVE') {
                  navigation.navigate('ActiveRide', { rideId: ride.id });
                } else {
                  navigation.navigate('RideSummary', { rideId: ride.id });
                }
              }} activeOpacity={0.7}>
                <RideCard ride={ride} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="information-circle-outline" size={24} color={colors.onSurfaceVariant} />
              <Text style={styles.emptyStateText}>No upcoming rides yet</Text>
            </View>
          )}

          <TouchableOpacity style={styles.planAnother} onPress={() => navigation.navigate('CreateRide')}>
            <Ionicons name="add-circle-outline" size={20} color={colors.onSurfaceVariant} />
            <Text style={styles.planAnotherText}>Plan another route</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  navProfileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  contentContainer: { padding: spacing.marginMobile, paddingBottom: moderateScale(100) },
  greetingSection: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd, marginBottom: spacing.stackLg },
  avatarContainer: { borderRadius: 9999, overflow: 'hidden', borderWidth: 2, borderColor: colors.outlineVariant },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { backgroundColor: colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { ...typography.labelTechnical, color: colors.primaryContainer },
  greetingText: { flex: 1 },
  greetingName: { ...typography.titleMd, color: colors.onSurface },
  greetingSubtitle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  statusDot: { width: scale(8), height: scale(8), borderRadius: 4, backgroundColor: colors.primaryContainer },
  greetingReady: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  ctaGrid: { gap: spacing.stackMd, marginBottom: spacing.stackLg },
  primaryCta: {
    backgroundColor: colors.primaryContainer, padding: spacing.stackLg, borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: colors.outlineVariant, gap: spacing.stackMd,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 0, elevation: 4,
  },
  ctaIconContainer: { width: scale(48), height: scale(48), borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  ctaTitle: { ...typography.titleMd, color: colors.onPrimaryContainer, textTransform: 'uppercase', letterSpacing: 1 },
  ctaSubtitle: { ...typography.bodyMd, color: colors.onPrimaryContainer, opacity: 0.8 },
  secondaryCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: moderateScale(64),
    borderWidth: 2, borderColor: colors.outlineVariant, borderRadius: borderRadius.xl, gap: spacing.stackSm,
  },
  ctaSecondaryText: { ...typography.labelTechnical, color: colors.onSurface },
  ridesSection: { gap: spacing.stackMd },
  ridesSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...typography.titleMd, color: colors.onSurface },
  viewAll: { ...typography.labelTechnical, color: colors.primaryContainer },
  rideCard: {
    backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.xl, padding: spacing.stackMd, gap: spacing.stackMd, overflow: 'hidden',
  },
  rideCardGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.03, backgroundColor: colors.outline },
  rideCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 },
  rideCardInfo: { gap: moderateScale(2) },
  rideCardTime: { ...typography.labelTechnical, color: colors.primaryContainer, fontSize: moderateScale(12) },
  rideCardName: { ...typography.titleMd, color: colors.onSurface },
  rideStatusBadge: {
    backgroundColor: 'rgba(255,214,0,0.15)', paddingHorizontal: moderateScale(8), paddingVertical: moderateScale(4),
    borderRadius: borderRadius.sm, borderWidth: 1, borderColor: 'rgba(255,214,0,0.3)',
  },
  rideStatusText: { ...typography.labelTechnical, color: colors.primaryContainer, fontSize: moderateScale(10) },
  rideCardDetails: { gap: spacing.stackSm, zIndex: 1 },
  rideDetailRow: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(4) },
  rideDetailText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  rideRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    marginTop: spacing.stackSm,
    paddingTop: spacing.stackSm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  rideRouteText: {
    flex: 1,
    ...typography.labelTechnical,
    color: colors.onSurface,
    fontSize: moderateScale(11),
  },
  emptyState: {
    borderWidth: 1, borderColor: colors.outlineVariant, borderStyle: 'dashed', borderRadius: borderRadius.xl,
    padding: spacing.stackLg, alignItems: 'center', gap: spacing.stackSm,
  },
  emptyStateText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  planAnother: {
    borderWidth: 1, borderColor: colors.outlineVariant, borderStyle: 'dashed', borderRadius: borderRadius.xl,
    padding: spacing.stackMd, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm,
  },
  planAnotherText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
});
