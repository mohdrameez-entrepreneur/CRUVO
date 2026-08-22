import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, scale, moderateScale } from '../theme';
import { ridesAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import FreeMap from '../components/FreeMap';
import UserAvatar from '../components/UserAvatar';
import useLocation from '../hooks/useLocation';
import useRideSocket from '../hooks/useRideSocket';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const ROLE_LABELS = { CREATOR: 'Lead', LEAD: 'Lead', SWEEP: 'Sweep', WINGMAN: 'Wingman', RIDER: 'Rider' };
const ARRIVAL_THRESHOLD_M = 200;

const STOP_TYPES = [
  { key: 'FUEL', icon: 'car', label: 'Fuel' },
  { key: 'FOOD', icon: 'restaurant', label: 'Food' },
  { key: 'BREAK', icon: 'pause-circle', label: 'Break' },
  { key: 'GENERAL', icon: 'ellipsis-horizontal', label: 'General' },
  { key: 'ISSUE', icon: 'warning', label: 'Issue' },
];

const FLAG_ICONS = { FUEL: 'car', FOOD: 'restaurant', BREAK: 'pause-circle', GENERAL: 'ellipsis-horizontal', ISSUE: 'warning' };

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ActiveRideScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { rideId } = route.params || {};
  const { user } = useAuth();
  const [ride, setRide] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [rideFinished, setRideFinished] = useState(false);
  const [arrivalCount, setArrivalCount] = useState(0);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagType, setFlagType] = useState('FUEL');
  const [flagging, setFlagging] = useState(false);
  const [myFlag, setMyFlag] = useState(null);
  const [allFlags, setAllFlags] = useState([]);
  const [clearingFlag, setClearingFlag] = useState(false);
  const [flagNotification, setFlagNotification] = useState(null);
  const [rideEndedBy, setRideEndedBy] = useState(null);
  const autoEndTriggered = useRef(false);
  const { location, startWatching, stopWatching, requestPermission } = useLocation(true);
  const fallbackInterval = useRef(null);
  const timerInterval = useRef(null);
  const wsConnected = useRef(false);
  const currentSpeed = useRef(0);

  const getPollingInterval = (speedMs) => {
    const speedKmh = (speedMs || 0) * 3.6;
    if (speedKmh < 1) return 10000;
    if (speedKmh < 30) return 5000;
    return 3000;
  };

  const startFallbackPolling = (interval) => {
    clearInterval(fallbackInterval.current);
    fallbackInterval.current = setInterval(() => {
      if (!wsConnected.current) {
        ridesAPI.getPositions(rideId).then(res => setPositions(res.data)).catch(() => {});
      }
    }, interval);
  };

  const handlePositionsUpdate = useCallback((data) => {
    if (typeof data === 'function') {
      setPositions(data);
    } else {
      setPositions(data);
    }
  }, []);

  const handleFlag = useCallback((flag) => {
    setAllFlags(prev => {
      const exists = prev.find(f => f.id === flag.id);
      if (exists) return prev;
      const enriched = { ...flag, flagged_by: flag.user };
      const next = [...prev, enriched];
      if (flag.user === user?.id) setMyFlag(enriched);
      return next;
    });
  }, [user?.id]);

  const handleFlagCleared = useCallback((userId) => {
    setAllFlags(prev => prev.filter(f => f.user !== userId));
    if (userId === user?.id) setMyFlag(null);
  }, [user?.id]);

  const FLAG_LABELS = { FUEL: 'Fuel', FOOD: 'Food', BREAK: 'Break', GENERAL: 'General', ISSUE: 'Issue' };

  const handleFlagNotification = useCallback((data) => {
    if (data.user_id === user?.id) return;
    const label = FLAG_LABELS[data.stop_type] || data.stop_type;
    setFlagNotification({ userName: data.user_name, stopType: label, locationName: data.location_name });
    setTimeout(() => setFlagNotification(null), 4000);
  }, [user?.id]);

  const handleRideEnded = useCallback((data) => {
    if (data.ended_by === user?.id) return;
    stopWatching();
    clearInterval(fallbackInterval.current);
    clearInterval(timerInterval.current);
    setRideEndedBy(data.ended_by_name);
    setRideFinished(true);
  }, [user?.id]);

  const { connected, wsError, sendPosition, sendFlag, sendClearFlag } = useRideSocket(rideId, {
    onPositionsUpdate: handlePositionsUpdate,
    onFlag: handleFlag,
    onFlagCleared: handleFlagCleared,
    onFlagNotification: handleFlagNotification,
    onRideEnded: handleRideEnded,
  });

  wsConnected.current = connected;

  const loadRideAndFlags = async () => {
    if (!rideId) return;
    try {
      const [rideRes, flagsRes] = await Promise.all([
        ridesAPI.get(rideId),
        ridesAPI.getFlagStops(rideId).catch(() => ({ data: [] })),
      ]);
      setRide(rideRes.data);
      const flags = (flagsRes.data || []).filter(f => !f.resolved_at);
      setAllFlags(flags);
      const mine = flags.find(f => f.flagged_by === user?.id);
      setMyFlag(mine || null);
    } catch {}
  };

  useEffect(() => {
    loadRideAndFlags().finally(() => setLoading(false));
  }, [rideId]);

  useEffect(() => {
    if (ride && ride.origin_lat && ride.destination_lat && !ride.route_polyline) {
      ridesAPI.fetchRoute(rideId).then(res => {
        setRide(prev => ({
          ...prev,
          route_polyline: JSON.stringify(res.data.route_polyline),
          route_distance_m: res.data.distance_km * 1000,
          route_duration_s: res.data.duration_s,
        }));
      }).catch(() => {});
    }
  }, [ride?.id, ride?.origin_lat, ride?.route_polyline]);

  useEffect(() => {
    requestPermission().then(granted => {
      if (granted) {
        startWatching((coords) => {
          const prevSpeed = currentSpeed.current;
          currentSpeed.current = coords.speed || 0;

          if (wsConnected.current) {
            sendPosition(coords.latitude, coords.longitude, coords.heading || 0, coords.speed || 0);
          } else {
            ridesAPI.updatePosition(rideId, {
              lat: coords.latitude,
              lng: coords.longitude,
              heading: coords.heading || 0,
              speed: coords.speed || 0,
            }).catch(() => {});
          }

          const speedDelta = Math.abs(coords.speed - prevSpeed);
          if (!wsConnected.current && speedDelta > 2) {
            const newInterval = getPollingInterval(coords.speed);
            startFallbackPolling(newInterval);
          }
        });
      }
    });

    startFallbackPolling(getPollingInterval(0));

    timerInterval.current = setInterval(() => setElapsed(prev => prev + 1), 1000);

    return () => {
      stopWatching();
      clearInterval(fallbackInterval.current);
      clearInterval(timerInterval.current);
    };
  }, [rideId]);

  useEffect(() => {
    if (!ride || !ride.destination_lat || rideFinished || autoEndTriggered.current) return;
    if (positions.length === 0) return;

    const arrived = positions.filter(p => {
      const dist = getDistanceMeters(p.lat, p.lng, ride.destination_lat, ride.destination_lng);
      return dist <= ARRIVAL_THRESHOLD_M;
    });

    setArrivalCount(arrived.length);

    const acceptedParticipants = (ride.participants || []).filter(p => p.status === 'ACCEPTED');
    const allArrived = acceptedParticipants.length > 0 && arrived.length >= acceptedParticipants.length;

    if (allArrived) {
      autoEndTriggered.current = true;
      completeRide();
    }
  }, [positions, ride?.destination_lat, rideFinished]);

  const completeRide = async () => {
    try {
      await ridesAPI.update(rideId, { status: 'COMPLETED' });
      stopWatching();
      clearInterval(fallbackInterval.current);
      clearInterval(timerInterval.current);
      setRideFinished(true);
    } catch {}
  };

  const endRide = () => {
    Alert.alert('End Ride', 'Mark this ride as completed?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Ride', style: 'destructive', onPress: completeRide },
    ]);
  };

  const handleViewSummary = () => {
    setRideFinished(false);
    navigation.navigate('RideSummary', { rideId });
  };

  const handleFlagPress = () => {
    if (myFlag) {
      Alert.alert(
        `${myFlag.stop_type} Stop Active`,
        'You have an active flag. Clear it to continue riding?',
        [
          { text: 'Keep Flagged', style: 'cancel' },
          { text: 'Clear Flag', onPress: handleClearFlag },
        ]
      );
    } else {
      setShowFlagModal(true);
    }
  };

  const handleFlagStop = async () => {
    if (!location) {
      Alert.alert('Location Required', 'Cannot flag a stop without location access');
      return;
    }
    setFlagging(true);
    try {
      if (connected) {
        sendFlag(flagType, location.latitude, location.longitude, `${flagType} stop`);
        setShowFlagModal(false);
      } else {
        await ridesAPI.createFlagStop(rideId, {
          stop_type: flagType,
          lat: location.latitude,
          lng: location.longitude,
          location_name: `${flagType} stop`,
        });
        setShowFlagModal(false);
        const flagsRes = await ridesAPI.getFlagStops(rideId);
        const flags = (flagsRes.data || []).filter(f => !f.resolved_at);
        setAllFlags(flags);
        const mine = flags.find(f => f.flagged_by === user?.id);
        setMyFlag(mine || null);
      }
    } catch {
      Alert.alert('Error', 'Failed to flag stop');
    } finally {
      setFlagging(false);
    }
  };

  const handleClearFlag = async () => {
    if (!myFlag) return;
    setClearingFlag(true);
    try {
      if (connected) {
        sendClearFlag();
      } else {
        await ridesAPI.clearFlag(rideId);
      }
      setMyFlag(null);
      setAllFlags(prev => prev.filter(f => f.flagged_by !== user?.id));
    } catch {
      Alert.alert('Error', 'Failed to clear flag');
    } finally {
      setClearingFlag(false);
    }
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryContainer} />
        <Text style={styles.loadingText}>Loading ride...</Text>
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={32} color={colors.onSurfaceVariant} />
        <Text style={styles.loadingText}>Ride not found</Text>
      </View>
    );
  }

  const participants = ride.participants || [];
  const isCreator = user && ride.creator === user.id;
  const flagIcon = myFlag ? (FLAG_ICONS[myFlag.stop_type] || 'flag') : 'flag';
  const flagLabel = myFlag ? myFlag.stop_type : null;

  const enrichedPositions = useMemo(() => {
    const pMap = {};
    participants.forEach(p => { pMap[p.user] = p; });
    return positions.map(pos => ({
      ...pos,
      initials: pMap[pos.user]?.initials || '??',
      display_name: pMap[pos.user]?.display_name || '',
    }));
  }, [positions, participants]);

  return (
    <View style={styles.container}>
      <View style={styles.mapWrap}>
        <FreeMap
          ride={ride}
          positions={enrichedPositions}
          myUserId={user?.id}
          userLocation={location}
          heading={location?.heading}
          followMyLocation
        />
      </View>

      <View style={[styles.floatingHeader, { top: insets.top + 8 }]}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{ride.name}</Text>
          <Text style={styles.headerSubtitle}>
            {positions.length} RIDER{positions.length !== 1 ? 'S' : ''} LIVE · {formatTime(elapsed)}
            {wsError ? ` · ${wsError}` : (connected ? '' : ' · OFFLINE')}
          </Text>
        </View>
        {isCreator && (
          <TouchableOpacity style={styles.endRideButton} onPress={endRide}>
            <Text style={styles.endRideText}>END</Text>
          </TouchableOpacity>
        )}
      </View>

      {flagNotification && (
        <View style={styles.flagBanner}>
          <Ionicons name="flag" size={18} color={colors.white} />
          <Text style={styles.flagBannerText}>
            <Text style={styles.flagBannerName}>{flagNotification.userName}</Text> flagged a {flagNotification.stopType} stop
            {flagNotification.locationName ? ` — ${flagNotification.locationName}` : ''}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.flagFab, myFlag && styles.flagFabActive]}
        onPress={handleFlagPress}
      >
        <Ionicons name={flagIcon} size={28} color={colors.white} />
        {flagLabel && <Text style={styles.flagFabLabel}>{flagLabel}</Text>}
      </TouchableOpacity>

      <View style={[styles.bottomPanel, panelExpanded && styles.bottomPanelExpanded, { paddingBottom: insets.bottom + 10 }]}>
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
            const riderFlag = allFlags.find(f => f.flagged_by === rider.user);
            return (
              <View key={rider.id || i} style={[styles.riderRow, riderFlag && styles.riderRowFlagged]}>
                <View style={styles.avatarWrap}>
                  <UserAvatar
                    avatarUrl={rider.avatar_url}
                    name={rider.display_name}
                    initials={rider.initials}
                    id={rider.user}
                    size={40}
                    style={isRiderCreator ? { borderWidth: 2, borderColor: colors.primaryContainer } : null}
                  />
                  {riderFlag && (
                    <View style={styles.flagBadge}>
                      <Ionicons name={FLAG_ICONS[riderFlag.stop_type] || 'flag'} size={12} color={colors.white} />
                    </View>
                  )}
                </View>
                <View style={styles.riderInfo}>
                  <Text style={styles.riderName}>
                    {rider.display_name} {isRiderCreator && <Text style={styles.youBadge}>Leader</Text>}
                    {!isRiderCreator && rider.user === user?.id && <Text style={styles.youBadge}>(You)</Text>}
                  </Text>
                  <Text style={styles.riderRole}>{ROLE_LABELS[rider.role] || rider.role}</Text>
                  {riderFlag && (
                    <View style={styles.flagTag}>
                      <Ionicons name={FLAG_ICONS[riderFlag.stop_type] || 'flag'} size={12} color="#e53935" />
                      <Text style={styles.flagTagText}>{riderFlag.stop_type}</Text>
                    </View>
                  )}
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

      <Modal visible={showFlagModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Flag a Stop</Text>
            <Text style={styles.modalSubtitle}>Let the crew know you need to pull over</Text>

            <View style={styles.flagGrid}>
              {STOP_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[styles.flagOption, flagType === type.key && styles.flagOptionActive]}
                  onPress={() => setFlagType(type.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={type.icon}
                    size={24}
                    color={flagType === type.key ? colors.onPrimaryContainer : colors.onSurfaceVariant}
                  />
                  <Text style={[styles.flagOptionLabel, flagType === type.key && styles.flagOptionLabelActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.flagButtonRow}>
              <TouchableOpacity
                style={styles.flagCancelBtn}
                onPress={() => setShowFlagModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.flagCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.flagSubmitBtn}
                onPress={handleFlagStop}
                disabled={flagging}
                activeOpacity={0.8}
              >
                {flagging ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="flag" size={18} color={colors.white} />
                )}
                <Text style={styles.flagSubmitText}>{flagging ? 'Flagging...' : 'Flag Stop'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={rideFinished} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.completeIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
            </View>
            <Text style={styles.completeTitle}>
              {rideEndedBy ? `${rideEndedBy} ended the ride` : 'Ride Complete!'}
            </Text>
            <Text style={styles.completeRideName}>{ride?.name}</Text>

            <View style={styles.completeStats}>
              <View style={styles.completeStat}>
                <Ionicons name="time" size={20} color={colors.primaryContainer} />
                <Text style={styles.completeStatValue}>{formatTime(elapsed)}</Text>
                <Text style={styles.completeStatLabel}>DURATION</Text>
              </View>
              <View style={styles.completeStatDivider} />
              <View style={styles.completeStat}>
                <Ionicons name="navigate" size={20} color={colors.primaryContainer} />
                <Text style={styles.completeStatValue}>{ride?.distance_km ? `${ride.distance_km} km` : 'N/A'}</Text>
                <Text style={styles.completeStatLabel}>DISTANCE</Text>
              </View>
              <View style={styles.completeStatDivider} />
              <View style={styles.completeStat}>
                <Ionicons name="people" size={20} color={colors.primaryContainer} />
                <Text style={styles.completeStatValue}>{positions.length}</Text>
                <Text style={styles.completeStatLabel}>RIDERS</Text>
              </View>
            </View>

            <View style={styles.completeRoute}>
              <View style={styles.completeRouteRow}>
                <Ionicons name="location" size={14} color={colors.primaryContainer} />
                <Text style={styles.completeRouteText} numberOfLines={1}>{ride?.origin_name}</Text>
              </View>
              <Ionicons name="arrow-down" size={14} color={colors.outlineVariant} />
              <View style={styles.completeRouteRow}>
                <Ionicons name="flag" size={14} color={colors.primaryContainer} />
                <Text style={styles.completeRouteText} numberOfLines={1}>{ride?.destination_name}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.completeButton} onPress={handleViewSummary} activeOpacity={0.8}>
              <Text style={styles.completeButtonText}>VIEW SUMMARY</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapWrap: { position: 'absolute', top: 0, left: 0, width, height },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.stackMd, backgroundColor: colors.background },
  loadingText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  floatingHeader: {
    position: 'absolute', top: spacing.stackLg, left: spacing.marginMobile, right: spacing.marginMobile,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surfaceContainer, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.xl, padding: spacing.stackMd,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  headerInfo: { flex: 1 },
  headerTitle: { ...typography.titleMd, color: colors.onSurface },
  headerSubtitle: { ...typography.labelTechnical, color: colors.primaryContainer, fontSize: 11 },
  endRideButton: {
    backgroundColor: colors.error, paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackSm,
    borderRadius: borderRadius.lg,
  },
  endRideText: { ...typography.labelTechnical, color: colors.white },
  flagFab: {
    position: 'absolute', bottom: 220, right: spacing.marginMobile,
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.error,
    justifyContent: 'center', alignItems: 'center', zIndex: 50,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 0, elevation: 8,
  },
  flagFabActive: {
    backgroundColor: '#FF9800',
  },
  flagFabLabel: {
    position: 'absolute', bottom: -18,
    ...typography.labelTechnical, color: colors.onSurface, fontSize: 9, textTransform: 'uppercase',
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
  riderRowFlagged: {
    backgroundColor: 'rgba(229,57,53,0.08)', borderLeftWidth: 3, borderLeftColor: '#e53935',
    paddingLeft: spacing.stackSm,
  },
  avatarWrap: { position: 'relative' },
  flagBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#e53935',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.surfaceContainerLowest,
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
  flagTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
    backgroundColor: 'rgba(229,57,53,0.15)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start',
  },
  flagTagText: { ...typography.labelSm, color: '#e53935', fontSize: 10, textTransform: 'uppercase' },
  riderStatus: { alignItems: 'flex-end' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' },
  liveText: { ...typography.labelTechnical, color: '#4CAF50', fontSize: 10 },
  offlineText: { ...typography.labelTechnical, color: colors.onSurfaceVariant, fontSize: 10 },
  flagBanner: {
    position: 'absolute', top: 110, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#e53935', borderRadius: borderRadius.lg,
    paddingHorizontal: 16, paddingVertical: 12,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
    zIndex: 60,
  },
  flagBannerText: { ...typography.bodyMd, color: colors.white, flex: 1 },
  flagBannerName: { ...typography.bodyMd, color: colors.white, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center',
    padding: spacing.stackLg,
  },
  modalCard: {
    backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.xl, padding: spacing.stackLg, width: '100%', gap: spacing.stackMd,
  },
  modalTitle: { ...typography.headlineLgMobile, color: colors.onSurface },
  modalSubtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  flagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.stackSm },
  flagOption: {
    width: '48%', aspectRatio: 1.8, backgroundColor: colors.surfaceContainer,
    borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center', gap: spacing.stackSm,
  },
  flagOptionActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  flagOptionLabel: { ...typography.labelTechnical, color: colors.onSurfaceVariant },
  flagOptionLabelActive: { color: colors.onPrimaryContainer },
  flagButtonRow: { flexDirection: 'row', gap: spacing.stackMd, marginTop: spacing.stackSm },
  flagCancelBtn: {
    flex: 1, height: spacing.touchTargetMin, borderWidth: 2, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center',
  },
  flagCancelText: { ...typography.labelTechnical, color: colors.onSurface },
  flagSubmitBtn: {
    flex: 2, height: spacing.touchTargetMin, backgroundColor: colors.error,
    borderRadius: borderRadius.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.stackSm,
  },
  flagSubmitText: { ...typography.titleMd, color: colors.white, textTransform: 'uppercase' },
  completeIcon: { alignItems: 'center', marginBottom: spacing.stackSm },
  completeTitle: { ...typography.headlineLgMobile, color: colors.onSurface, textAlign: 'center' },
  completeRideName: { ...typography.labelTechnical, color: colors.primaryContainer, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
  completeStats: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh, borderRadius: borderRadius.lg,
    padding: spacing.stackMd, gap: spacing.stackMd,
  },
  completeStat: { flex: 1, alignItems: 'center', gap: 4 },
  completeStatValue: { ...typography.headlineLg, color: colors.primaryContainer, fontSize: 22 },
  completeStatLabel: { ...typography.labelTechnical, color: colors.onSurfaceVariant, fontSize: 10 },
  completeStatDivider: { width: 1, height: 36, backgroundColor: colors.outlineVariant },
  completeRoute: {
    gap: 6, backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.lg, padding: spacing.stackMd,
  },
  completeRouteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  completeRouteText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  completeButton: {
    height: 52, borderRadius: borderRadius.lg, backgroundColor: colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 0, elevation: 4,
  },
  completeButtonText: { ...typography.titleMd, color: colors.onPrimaryContainer, textTransform: 'uppercase' },
});
