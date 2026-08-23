import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  LayoutAnimation,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, scale, moderateScale } from '../theme';
import { ridesAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import FreeMap from '../components/FreeMap';
import UserAvatar from '../components/UserAvatar';
import useLocation from '../hooks/useLocation';
import useRideSocket from '../hooks/useRideSocket';
import GlassModal from '../components/GlassModal';
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
  const { user, profile } = useAuth();
  const [ride, setRide] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rosterExpanded, setRosterExpanded] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
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
  const [showEndRideModal, setShowEndRideModal] = useState(false);
  const [showClearFlagModal, setShowClearFlagModal] = useState(false);
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
    setShowEndRideModal(true);
  };

  const handleConfirmEndRide = async () => {
    setShowEndRideModal(false);
    await completeRide();
  };

  const handleViewSummary = () => {
    setRideFinished(false);
    navigation.navigate('RideSummary', { rideId });
  };

  const handleFlagPress = () => {
    if (myFlag) {
      setShowClearFlagModal(true);
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

  const participants = ride?.participants || [];
  const isCreator = Boolean(user && ride?.creator === user.id);
  const flagIcon = myFlag ? (FLAG_ICONS[myFlag.stop_type] || 'flag') : 'flag';
  const flagLabel = myFlag ? myFlag.stop_type : null;

  const enrichedPositions = useMemo(() => {
    const pMap = {};
    participants.forEach(p => { pMap[p.user] = p; });
    const list = positions.map(pos => ({
      ...pos,
      initials: (pos.user === user?.id ? (profile?.initials || pMap[pos.user]?.initials) : pMap[pos.user]?.initials) || pos.initials || '??',
      display_name: (pos.user === user?.id ? (profile?.display_name || pMap[pos.user]?.display_name) : pMap[pos.user]?.display_name) || pos.display_name || '',
      avatar_url: (pos.user === user?.id ? (profile?.avatar_url || pMap[pos.user]?.avatar_url) : pMap[pos.user]?.avatar_url) || pos.avatar_url || null,
    }));

    if (user?.id && location && !list.some(p => p.user === user.id)) {
      list.push({
        user: user.id,
        lat: location.latitude,
        lng: location.longitude,
        heading: location.heading || 0,
        speed: location.speed || 0,
        initials: profile?.initials || user?.username?.substring(0, 2).toUpperCase() || 'ME',
        display_name: profile?.display_name || user?.username || 'You',
        avatar_url: profile?.avatar_url || null,
      });
    }

    return list;
  }, [positions, participants, user, profile, location]);

  const toggleRoster = (expand) => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.spring, springDamping: 0.82 },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setRosterExpanded(expand);
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
          recenterTrigger={recenterTrigger}
        />
      </View>

      {/* Top Floating Header - Aesthetic Matching Rider Roster */}
      <View style={[styles.floatingHeader, { top: insets.top + 8 }]}>
        <View style={styles.headerMain}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {ride.name}
            </Text>
            {isCreator && (
              <TouchableOpacity style={styles.endRideButton} onPress={endRide} activeOpacity={0.8}>
                <Ionicons name="stop" size={10} color={colors.white} />
                <Text style={styles.endRideText}>END</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Route path (From -> To in small clean text) */}
          {(ride.origin_name || ride.destination_name) ? (
            <View style={styles.headerRouteRow}>
              <View style={styles.originDot} />
              <Text style={styles.headerRouteText} numberOfLines={1}>
                {ride.origin_name || 'Start'}
              </Text>
              <Ionicons name="arrow-forward" size={10} color={colors.primaryContainer} style={styles.routeArrow} />
              <View style={styles.destDot} />
              <Text style={styles.headerRouteText} numberOfLines={1}>
                {ride.destination_name || 'End'}
              </Text>
            </View>
          ) : null}

          {/* Subtitle / Live stats row */}
          <View style={styles.headerStatsRow}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>{positions.length} LIVE</Text>
            </View>
            <Text style={styles.statsDot}>·</Text>
            <View style={styles.elapsedBadge}>
              <Ionicons name="time-outline" size={11} color={colors.onSurfaceVariant} />
              <Text style={styles.elapsedText}>{formatTime(elapsed)}</Text>
            </View>
            {ride?.distance_km ? (
              <>
                <Text style={styles.statsDot}>·</Text>
                <Text style={styles.distanceBadgeText}>{ride.distance_km} km</Text>
              </>
            ) : null}
            {wsError ? (
              <>
                <Text style={styles.statsDot}>·</Text>
                <Text style={styles.offlineStatusText}>{wsError}</Text>
              </>
            ) : !connected ? (
              <>
                <Text style={styles.statsDot}>·</Text>
                <Text style={styles.offlineStatusText}>OFFLINE</Text>
              </>
            ) : null}
          </View>
        </View>
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

      {/* Floating Action Buttons: Relocate Map & Flag Stop */}
      <View style={[styles.fabStack, { bottom: rosterExpanded ? 240 : insets.bottom + 65 }]}>
        <TouchableOpacity
          style={styles.relocateFab}
          onPress={() => setRecenterTrigger(prev => prev + 1)}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={20} color={colors.primaryContainer} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.flagFab, myFlag && styles.flagFabActive]}
          onPress={handleFlagPress}
          activeOpacity={0.8}
        >
          <Ionicons name={flagIcon} size={20} color={colors.white} />
          {flagLabel && <Text style={styles.flagFabLabel}>{flagLabel}</Text>}
        </TouchableOpacity>
      </View>

      {/* Minimizable Rider Roster with smooth animation */}
      {!rosterExpanded ? (
        <TouchableOpacity
          style={[styles.rosterPill, { bottom: insets.bottom + 10 }]}
          onPress={() => toggleRoster(true)}
          activeOpacity={0.85}
        >
          <View style={styles.rosterPillLeft}>
            <View style={styles.liveDot} />
            <Ionicons name="people" size={16} color={colors.primaryContainer} />
            <Text style={styles.rosterPillTitle}>
              {positions.length} Rider{positions.length !== 1 ? 's' : ''} Live
            </Text>
          </View>
          <View style={styles.rosterPillRight}>
            <Text style={styles.rosterPillAction}>Roster</Text>
            <Ionicons name="chevron-up" size={16} color={colors.onSurfaceVariant} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity style={styles.panelHandle} onPress={() => toggleRoster(false)}>
            <View style={styles.handleBar} />
          </TouchableOpacity>

          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelTitle}>Rider Roster</Text>
              <Text style={styles.panelSubtitle}>{positions.length} riders broadcasting</Text>
            </View>
            <TouchableOpacity
              style={styles.panelMinimizeBtn}
              onPress={() => toggleRoster(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-down" size={22} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
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
      )}

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

      {/* Glassmorphic End Ride Modal */}
      <GlassModal
        visible={showEndRideModal}
        type="danger"
        icon="stop-circle-outline"
        badge="LEAD ACTION"
        title="End Active Ride?"
        message={`Are you sure you want to end "${ride?.name}"? All riders will be transitioned to the ride summary.`}
        confirmText="END RIDE"
        cancelText="KEEP RIDING"
        onConfirm={handleConfirmEndRide}
        onCancel={() => setShowEndRideModal(false)}
      />

      {/* Glassmorphic Clear Flag Modal */}
      <GlassModal
        visible={showClearFlagModal}
        type="warning"
        icon="flag"
        badge={`${myFlag?.stop_type || 'FLAG'} STOP ACTIVE`}
        title="Clear Stop Flag?"
        message="You currently have a broadcasted stop flag. Clear it to notify squad members that you are ready to roll?"
        confirmText="CLEAR FLAG"
        cancelText="KEEP FLAGGED"
        onConfirm={() => {
          setShowClearFlagModal(false);
          handleClearFlag();
        }}
        onCancel={() => setShowClearFlagModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapWrap: { position: 'absolute', top: 0, left: 0, width, height },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.stackMd, backgroundColor: colors.background },
  loadingText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  floatingHeader: {
    position: 'absolute',
    top: spacing.stackLg,
    left: spacing.marginMobile,
    right: spacing.marginMobile,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 50,
  },
  headerMain: {
    width: '100%',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  endRideButton: {
    backgroundColor: 'rgba(229,57,53,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(229,57,53,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  endRideText: {
    ...typography.labelTechnical,
    color: '#ff6b6b',
    fontSize: 10,
    fontWeight: '800',
  },
  headerRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 5,
  },
  originDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  destDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e53935',
  },
  headerRouteText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    maxWidth: '42%',
  },
  routeArrow: {
    marginHorizontal: 1,
  },
  headerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(76,175,80,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    ...typography.labelTechnical,
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: '700',
  },
  elapsedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  elapsedText: {
    ...typography.labelTechnical,
    color: colors.onSurfaceVariant,
    fontSize: 10,
  },
  distanceBadgeText: {
    ...typography.labelTechnical,
    color: colors.primaryContainer,
    fontSize: 10,
  },
  statsDot: {
    color: colors.outlineVariant,
    fontSize: 10,
  },
  offlineStatusText: {
    ...typography.labelTechnical,
    color: colors.error,
    fontSize: 10,
  },
  fabStack: {
    position: 'absolute',
    right: spacing.marginMobile,
    alignItems: 'center',
    gap: 12,
    zIndex: 50,
  },
  relocateFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  flagFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  flagFabActive: {
    backgroundColor: '#FF9800',
  },
  flagFabLabel: {
    position: 'absolute',
    bottom: -15,
    ...typography.labelTechnical,
    color: colors.onSurface,
    fontSize: 8,
    textTransform: 'uppercase',
  },
  rosterPill: {
    position: 'absolute',
    left: spacing.marginMobile,
    right: spacing.marginMobile,
    height: 46,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.stackMd,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 40,
  },
  rosterPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rosterPillTitle: {
    ...typography.labelTechnical,
    color: colors.onSurface,
    fontSize: 12,
  },
  rosterPillRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rosterPillAction: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceContainerLow,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: 34,
    maxHeight: height * 0.45,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    zIndex: 45,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  panelMinimizeBtn: {
    padding: 4,
  },
  panelHandle: { padding: spacing.stackSm, alignItems: 'center' },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.marginMobile,
    marginBottom: spacing.stackSm,
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
