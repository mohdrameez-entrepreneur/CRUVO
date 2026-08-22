import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, scale, moderateScale } from '../theme';
import { ridesAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import FreeMap from '../components/FreeMap';
import UserAvatar from '../components/UserAvatar';
import AlertCard from '../components/AlertCard';
import useRideLobby from '../hooks/useRideLobby';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const ROLE_LABELS = { CREATOR: 'Lead Navigator', LEAD: 'Lead Navigator', SWEEP: 'Sweep', WINGMAN: 'Wingman', RIDER: 'Rider' };

export default function RideSummaryScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { rideId } = route.params || {};
  const { user } = useAuth();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [togglingReady, setTogglingReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [fetchingRoute, setFetchingRoute] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);

  const onReadyUpdate = useCallback((data) => {
    setRide(prev => {
      if (!prev) return prev;
      const updatedParticipants = prev.participants.map(p =>
        p.user === data.user_id ? { ...p, is_ready: data.is_ready } : p
      );
      return { ...prev, participants: updatedParticipants };
    });
  }, []);

  const onRideStarted = useCallback((data) => {
    console.log('[RideSummary] Ride started via WS, redirecting...');
    navigation.replace('ActiveRide', { rideId: data.ride_id || rideId });
  }, [navigation, rideId]);

  useRideLobby(rideId, { onReadyUpdate, onRideStarted });

  const loadRide = async () => {
    if (!rideId) return;
    try {
      const res = await ridesAPI.get(rideId);
      setRide(res.data);
    } catch {}
  };

  useEffect(() => {
    if (!rideId) { setLoading(false); return; }
    loadRide().finally(() => setLoading(false));
  }, [rideId]);

  useEffect(() => {
    if (ride && ride.origin_lat && ride.destination_lat && !ride.route_polyline && ride.status === 'SCHEDULED') {
      setFetchingRoute(true);
      ridesAPI.fetchRoute(rideId).then(res => {
        setRide(prev => ({
          ...prev,
          route_polyline: JSON.stringify(res.data.route_polyline),
          distance_km: res.data.distance_km,
          route_distance_m: res.data.distance_km * 1000,
          route_duration_s: res.data.duration_s,
        }));
      }).catch(() => {}).finally(() => setFetchingRoute(false));
    }
  }, [ride?.id, ride?.origin_lat, ride?.route_polyline]);

  const handleDelete = () => {
    if (!ride) return;
    Alert.alert(
      'Delete Ride',
      `Are you sure you want to delete "${ride.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ridesAPI.delete(ride.id);
              navigation.navigate('Main', { screen: 'Rides' });
            } catch (err) {
              const msg = err.response?.data?.error || 'Failed to delete ride';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  const handleToggleReady = async () => {
    setTogglingReady(true);
    try {
      const res = await ridesAPI.toggleReady(rideId);
      setRide(prev => {
        if (!prev) return prev;
        const updatedParticipants = prev.participants.map(p =>
          p.user === user.id ? { ...p, is_ready: res.data.is_ready } : p
        );
        return { ...prev, participants: updatedParticipants };
      });
    } catch (err) {
      setErrorBanner('Failed to update ready status. Please check your connection.');
    } finally {
      setTogglingReady(false);
    }
  };

  const handleStartRide = async () => {
    setStarting(true);
    setErrorBanner(null);
    try {
      const res = await ridesAPI.startRide(rideId);
      setRide(res.data);
      navigation.navigate('ActiveRide', { rideId });
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to start ride. Make sure all riders are ready.';
      setErrorBanner(msg);
    } finally {
      setStarting(false);
    }
  };

  const isCreator = ride && user && ride.creator === user.id;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <View style={styles.topBarButton} />
          <Text style={styles.topBarTitle}>CRUVO</Text>
          <View style={styles.topBarButton} />
        </View>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primaryContainer} />
          <Text style={styles.emptyText}>Loading ride...</Text>
        </View>
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <View style={styles.topBarButton} />
          <Text style={styles.topBarTitle}>CRUVO</Text>
          <View style={styles.topBarButton} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyText}>Ride not found</Text>
        </View>
      </View>
    );
  }

  const participants = ride.participants || [];
  const acceptedParticipants = participants.filter(p => p.status === 'ACCEPTED');
  const nonCreatorRiders = acceptedParticipants.filter(p => p.user !== ride.creator);
  const readyCount = nonCreatorRiders.filter(p => p.is_ready).length;
  const totalRiders = nonCreatorRiders.length;
  const noOtherRiders = totalRiders === 0;
  const allReady = noOtherRiders || readyCount === totalRiders;
  const myParticipant = participants.find(p => p.user === user?.id);
  const myReady = myParticipant?.is_ready || false;
  const isScheduled = ride.status === 'SCHEDULED';
  const hasRoute = ride.origin_lat && ride.destination_lat;

  const formatDuration = (s) => {
    if (!s) return 'TBD';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const stats = [
    { label: 'Date', value: new Date(ride.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), icon: 'calendar' },
    { label: 'Distance', value: ride.distance_km ? `${ride.distance_km} km` : 'TBD', icon: 'navigate' },
    { label: 'Duration', value: formatDuration(ride.route_duration_s), icon: 'time' },
    { label: 'Riders', value: noOtherRiders ? 'Solo' : `${readyCount}/${totalRiders}`, icon: 'people' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.topBarButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryContainer} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>CRUVO</Text>
        <View style={styles.topBarButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {errorBanner && (
          <AlertCard
            type="error"
            title="Action Failed"
            message={errorBanner}
            onDismiss={() => setErrorBanner(null)}
            style={{ marginBottom: spacing.stackMd }}
          />
        )}
        <View style={styles.header}>
          <Ionicons name={ride.status === 'COMPLETED' ? 'checkmark-circle' : 'bicycle'} size={48} color={colors.primaryContainer} />
          <Text style={styles.headerTitle}>{ride.name}</Text>
          <Text style={styles.headerSubtitle}>{ride.status}</Text>
        </View>

        {hasRoute && (
          <View style={styles.mapPreview}>
            <FreeMap ride={ride} positions={[]} followMyLocation={false} style={styles.mapPreviewInner} />
            {fetchingRoute && (
              <View style={styles.routeLoading}>
                <ActivityIndicator size="small" color={colors.primaryContainer} />
                <Text style={styles.routeLoadingText}>Calculating route...</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <Ionicons name="location" size={16} color={colors.primaryContainer} />
            <Text style={styles.routeText}>{ride.origin_name || 'TBD'}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <Ionicons name="flag" size={16} color={colors.primaryContainer} />
            <Text style={styles.routeText}>{ride.destination_name || 'TBD'}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons name={stat.icon} size={24} color={colors.primaryContainer} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        <View style={styles.squadSection}>
          <Text style={styles.sectionTitle}>Squad</Text>
          {participants.map((rider, i) => {
            const isRiderCreator = rider.user === ride.creator;
            return (
              <View key={rider.id || i} style={styles.riderRow}>
                <UserAvatar
                  avatarUrl={rider.avatar_url}
                  name={rider.display_name}
                  initials={rider.initials}
                  id={rider.user}
                  size={44}
                  style={!isRiderCreator && rider.is_ready ? styles.avatarReady : null}
                />
                <View style={styles.riderInfo}>
                  <Text style={styles.riderName}>
                    {rider.display_name} {isRiderCreator && <Text style={styles.youBadge}>Leader</Text>}
                    {!isRiderCreator && rider.user === user?.id && <Text style={styles.youBadge}>(You)</Text>}
                  </Text>
                  <Text style={styles.riderRole}>{ROLE_LABELS[rider.role] || rider.role}</Text>
                </View>
                {!isRiderCreator && (
                  <View style={styles.readyIndicator}>
                    <Ionicons
                      name={rider.is_ready ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={rider.is_ready ? '#4CAF50' : colors.outlineVariant}
                    />
                    <Text style={[styles.readyText, rider.is_ready && styles.readyTextActive]}>
                      {rider.is_ready ? 'Ready' : 'Waiting'}
                    </Text>
                  </View>
                )}
                {isRiderCreator && (
                  <View style={styles.readyIndicator}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.primaryContainer} />
                  </View>
                )}
              </View>
            );
          })}
          {participants.length === 0 && (
            <Text style={styles.emptyText}>No riders yet</Text>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {isScheduled && !isCreator && myParticipant?.status === 'ACCEPTED' && (
          <TouchableOpacity
            style={[styles.readyButton, myReady && styles.readyButtonActive]}
            onPress={handleToggleReady}
            disabled={togglingReady}
            activeOpacity={0.8}
          >
            {togglingReady ? (
              <ActivityIndicator size="small" color={myReady ? colors.onPrimaryContainer : colors.primaryContainer} />
            ) : (
              <Ionicons name={myReady ? 'checkmark-circle' : 'radio-button-off'} size={20} color={myReady ? colors.onPrimaryContainer : colors.primaryContainer} />
            )}
            <Text style={[styles.readyButtonText, myReady && styles.readyButtonTextActive]}>
              {myReady ? 'READY' : 'MARK READY'}
            </Text>
          </TouchableOpacity>
        )}

        {isScheduled && isCreator && (
          <>
            <View style={styles.readyStatus}>
              <Ionicons
                name={allReady ? 'checkmark-circle' : 'time-outline'}
                size={16}
                color={allReady ? '#4CAF50' : colors.onSurfaceVariant}
              />
              <Text style={[styles.readyStatusText, allReady && styles.readyStatusTextActive]}>
                {noOtherRiders ? 'Ready to ride' : allReady ? 'All riders ready!' : `${readyCount}/${totalRiders} riders ready`}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.startButton, !allReady && styles.startButtonDisabled]}
              onPress={handleStartRide}
              disabled={!allReady || starting}
              activeOpacity={0.8}
            >
              {starting ? (
                <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
              ) : (
                <Ionicons name="play" size={20} color={colors.onPrimaryContainer} />
              )}
              <Text style={styles.startButtonText}>
                {allReady ? 'START RIDE' : 'WAITING FOR RIDERS'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {isCreator && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.deleteText}>DELETE RIDE</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.doneButton} onPress={() => navigation.navigate('Main')} activeOpacity={0.8}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, minHeight: spacing.touchTargetMin, paddingTop: 0,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  topBarButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { ...typography.displayLg, color: colors.primaryContainer, fontSize: 24, textTransform: 'uppercase', letterSpacing: -0.8 },
  content: { padding: spacing.marginMobile, paddingBottom: 250 },
  header: { alignItems: 'center', gap: spacing.stackSm, marginBottom: spacing.stackLg },
  headerTitle: { ...typography.headlineLgMobile, color: colors.onSurface },
  headerSubtitle: { ...typography.labelTechnical, color: colors.primaryContainer },
  mapPreview: {
    height: 180, borderRadius: borderRadius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.stackLg,
    backgroundColor: colors.surfaceContainerLow,
  },
  mapPreviewInner: { flex: 1 },
  routeLoading: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.stackSm, backgroundColor: 'rgba(0,0,0,0.7)',
  },
  routeLoadingText: { ...typography.labelSm, color: colors.primaryContainer },
  routeCard: {
    backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg, padding: spacing.stackMd, marginBottom: spacing.stackLg, gap: spacing.stackSm,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  routeText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  routeLine: { width: 1, height: 12, backgroundColor: colors.outlineVariant, marginLeft: 7 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.stackSm, marginBottom: spacing.stackLg },
  statCard: {
    width: (width - spacing.marginMobile * 2 - spacing.stackSm) / 2,
    backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg, padding: spacing.stackMd, alignItems: 'center', gap: spacing.stackSm,
  },
  statValue: { ...typography.headlineLg, color: colors.primaryContainer },
  statLabel: { ...typography.labelTechnical, color: colors.onSurfaceVariant, fontSize: 11 },
  squadSection: { gap: spacing.stackMd },
  sectionTitle: { ...typography.titleMd, color: colors.onSurface },
  riderRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.stackMd,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant, gap: spacing.stackMd,
  },
  riderAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center',
  },
  riderAvatarReady: { backgroundColor: 'rgba(76,175,80,0.2)', borderWidth: 2, borderColor: '#4CAF50' },
  avatarReady: { borderWidth: 2, borderColor: '#4CAF50' },
  riderInitials: { ...typography.labelTechnical, color: colors.onSurface },
  riderInfo: { flex: 1 },
  riderName: { ...typography.bodyMd, color: colors.onSurface },
  youBadge: { ...typography.labelSm, color: colors.primaryContainer },
  riderRole: { ...typography.labelSm, color: colors.onSurfaceVariant },
  readyIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readyText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  readyTextActive: { color: '#4CAF50' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.marginMobile, paddingBottom: 34, gap: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLowest, borderTopWidth: 1, borderTopColor: colors.outlineVariant,
  },
  readyButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm,
    height: 52, borderRadius: borderRadius.lg,
    borderWidth: 2, borderColor: colors.primaryContainer,
  },
  readyButtonActive: {
    backgroundColor: '#4CAF50', borderColor: '#4CAF50',
  },
  readyButtonText: { ...typography.titleMd, color: colors.primaryContainer },
  readyButtonTextActive: { color: colors.white },
  readyStatus: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  readyStatusText: { ...typography.labelTechnical, color: colors.onSurfaceVariant },
  readyStatusTextActive: { color: '#4CAF50' },
  startButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm,
    height: 52, borderRadius: borderRadius.lg, backgroundColor: '#4CAF50',
  },
  startButtonDisabled: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  startButtonText: { ...typography.titleMd, color: colors.white },
  deleteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm,
    height: 48, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.error,
  },
  deleteText: { ...typography.labelTechnical, color: colors.error, fontSize: 13 },
  doneButton: {
    backgroundColor: colors.primaryContainer, height: spacing.touchTargetMin, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 0, elevation: 4,
  },
  doneText: { ...typography.titleMd, color: colors.onPrimaryContainer, textTransform: 'uppercase' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.stackMd },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
});
