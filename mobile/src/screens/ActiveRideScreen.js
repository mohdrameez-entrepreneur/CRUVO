import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';
import { ridesAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import RideMap from '../components/RideMap';
import useLocation from '../hooks/useLocation';

const { width, height } = Dimensions.get('window');
const ROLE_LABELS = { CREATOR: 'Lead', LEAD: 'Lead', SWEEP: 'Sweep', WINGMAN: 'Wingman', RIDER: 'Rider' };

export default function ActiveRideScreen({ navigation, route }) {
  const { rideId } = route.params || {};
  const { user } = useAuth();
  const [ride, setRide] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const { location, startWatching, stopWatching, requestPermission } = useLocation(true);
  const posInterval = useRef(null);
  const timerInterval = useRef(null);

  useEffect(() => {
    if (!rideId) { setLoading(false); return; }
    Promise.all([
      ridesAPI.get(rideId),
      ridesAPI.getPositions(rideId).catch(() => ({ data: [] })),
    ]).then(([rideRes, posRes]) => {
      setRide(rideRes.data);
      setPositions(posRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [rideId]);

  useEffect(() => {
    requestPermission().then(granted => {
      if (granted) {
        startWatching((coords) => {
          ridesAPI.updatePosition(rideId, {
            lat: coords.latitude,
            lng: coords.longitude,
            heading: coords.heading || 0,
            speed: coords.speed || 0,
          }).catch(() => {});
        });
      }
    });

    posInterval.current = setInterval(() => {
      ridesAPI.getPositions(rideId).then(res => setPositions(res.data)).catch(() => {});
    }, 3000);

    timerInterval.current = setInterval(() => setElapsed(prev => prev + 1), 1000);

    return () => {
      stopWatching();
      clearInterval(posInterval.current);
      clearInterval(timerInterval.current);
    };
  }, [rideId]);

  const endRide = async () => {
    Alert.alert('End Ride', 'Mark this ride as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Ride',
        style: 'destructive',
        onPress: async () => {
          try {
            await ridesAPI.update(rideId, { status: 'COMPLETED' });
            stopWatching();
            clearInterval(posInterval.current);
            clearInterval(timerInterval.current);
            navigation.navigate('RideSummary', { rideId });
          } catch {}
        },
      },
    ]);
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primaryContainer} />
          <Text style={styles.loadingText}>Loading ride...</Text>
        </View>
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingWrap}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.onSurfaceVariant} />
          <Text style={styles.loadingText}>Ride not found</Text>
        </View>
      </View>
    );
  }

  const participants = ride.participants || [];
  const isCreator = user && ride.creator === user.id;

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <RideMap
          ride={ride}
          positions={positions}
          myUserId={user?.id}
          followMyLocation
        />

        <View style={styles.floatingHeader}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{ride.name}</Text>
            <Text style={styles.headerSubtitle}>
              {positions.length} RIDER{positions.length !== 1 ? 'S' : ''} LIVE · {formatTime(elapsed)}
            </Text>
          </View>
          {isCreator && (
            <TouchableOpacity style={styles.endRideButton} onPress={endRide}>
              <Text style={styles.endRideText}>END</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sideControls}>
          <TouchableOpacity style={styles.controlButton}
            onPress={() => {
              if (location) {
                ridesAPI.getPositions(rideId).then(res => setPositions(res.data)).catch(() => {});
              }
            }}>
            <Ionicons name="refresh" size={24} color={colors.onSurface} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.flagFab} onPress={() => navigation.navigate('FlagStop', { rideId })}>
          <Ionicons name="flag" size={28} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={[styles.bottomPanel, panelExpanded && styles.bottomPanelExpanded]}>
        <TouchableOpacity style={styles.panelHandle} onPress={() => setPanelExpanded(!panelExpanded)}>
          <View style={styles.handleBar} />
        </TouchableOpacity>

        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelTitle}>Rider Roster</Text>
            <Text style={styles.panelSubtitle}>{positions.length} riders broadcasting</Text>
          </View>
        </View>

        <ScrollView style={styles.riderList}>
          {participants.map((rider, i) => {
            const pos = positions.find(p => p.user === rider.user);
            const isRiderCreator = rider.user === ride.creator;
            return (
              <View key={rider.id || i} style={styles.riderRow}>
                <View style={[styles.riderAvatar, isRiderCreator && styles.riderAvatarLead]}>
                  <Text style={styles.riderAvatarText}>{rider.initials}</Text>
                </View>
                <View style={styles.riderInfo}>
                  <Text style={styles.riderName}>
                    {rider.display_name} {isRiderCreator && <Text style={styles.youBadge}>Leader</Text>}
                    {!isRiderCreator && rider.user === user?.id && <Text style={styles.youBadge}>(You)</Text>}
                  </Text>
                  <Text style={styles.riderRole}>{ROLE_LABELS[rider.role] || rider.role}</Text>
                </View>
                <View style={styles.riderStatus}>
                  {pos ? (
                    <View style={styles.liveIndicator}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  ) : (
                    <Text style={styles.offlineText}>Offline</Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapContainer: { flex: 1, position: 'relative' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.stackMd },
  loadingText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  floatingHeader: {
    position: 'absolute', top: spacing.stackLg, left: spacing.marginMobile, right: spacing.marginMobile,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surfaceContainer, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.xl, padding: spacing.stackMd,
  },
  headerInfo: { flex: 1 },
  headerTitle: { ...typography.titleMd, color: colors.onSurface },
  headerSubtitle: { ...typography.labelTechnical, color: colors.primaryContainer, fontSize: 11 },
  endRideButton: {
    backgroundColor: colors.error, paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackSm,
    borderRadius: borderRadius.lg,
  },
  endRideText: { ...typography.labelTechnical, color: colors.white },
  sideControls: {
    position: 'absolute', right: spacing.marginMobile, top: '50%', gap: spacing.stackSm,
  },
  controlButton: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceContainer,
    borderWidth: 1, borderColor: colors.outlineVariant, justifyContent: 'center', alignItems: 'center',
  },
  flagFab: {
    position: 'absolute', bottom: 200, right: spacing.marginMobile,
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.error,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 0, elevation: 8,
  },
  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surfaceContainerLow, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl,
    paddingBottom: 34, maxHeight: 200,
  },
  bottomPanelExpanded: { maxHeight: height * 0.5 },
  panelHandle: { padding: spacing.stackMd, alignItems: 'center' },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant },
  panelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, marginBottom: spacing.stackMd,
  },
  panelTitle: { ...typography.titleMd, color: colors.onSurface },
  panelSubtitle: { ...typography.labelSm, color: colors.onSurfaceVariant },
  riderList: { paddingHorizontal: spacing.marginMobile },
  riderRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.stackSm,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant, gap: spacing.stackMd,
  },
  riderAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center',
  },
  riderAvatarLead: { backgroundColor: colors.primaryContainer },
  riderAvatarText: { ...typography.labelTechnical, color: colors.onSurface, fontSize: 12 },
  riderInfo: { flex: 1 },
  riderName: { ...typography.bodyMd, color: colors.onSurface },
  youBadge: { ...typography.labelSm, color: colors.primaryContainer },
  riderRole: { ...typography.labelSm, color: colors.onSurfaceVariant },
  riderStatus: { alignItems: 'flex-end' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' },
  liveText: { ...typography.labelTechnical, color: '#4CAF50', fontSize: 10 },
  offlineText: { ...typography.labelTechnical, color: colors.onSurfaceVariant, fontSize: 10 },
});
