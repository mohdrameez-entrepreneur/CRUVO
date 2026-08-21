import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';
import { ridesAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

const ROLE_LABELS = { CREATOR: 'Lead', LEAD: 'Lead', SWEEP: 'Sweep', WINGMAN: 'Wingman', RIDER: 'Rider' };
const MARKER_COLORS = [colors.primaryContainer, '#4CAF50', '#FF9800', '#2196F3', '#E91E63', '#9C27B0'];

function RiderMarker({ initials, label, color, style }) {
  return (
    <View style={[styles.marker, style]}>
      <View style={[styles.markerDot, { backgroundColor: color }]}>
        <Text style={styles.markerText}>{initials}</Text>
      </View>
      <Text style={styles.markerLabel}>{label}</Text>
    </View>
  );
}

export default function ActiveRideScreen({ navigation, route }) {
  const { rideId } = route.params || {};
  const { user } = useAuth();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [panelExpanded, setPanelExpanded] = useState(false);

  useEffect(() => {
    if (!rideId) { setLoading(false); return; }
    ridesAPI.get(rideId).then(res => { setRide(res.data); }).catch(() => {}).finally(() => setLoading(false));
  }, [rideId]);

  const endRide = async () => {
    try {
      await ridesAPI.update(rideId, { status: 'COMPLETED' });
      navigation.navigate('RideSummary', { rideId });
    } catch {}
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.mapContainer}>
          <View style={styles.mapGrid} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primaryContainer} />
            <Text style={styles.loadingText}>Loading ride...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={styles.container}>
        <View style={styles.mapContainer}>
          <View style={styles.mapGrid} />
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.onSurfaceVariant} />
            <Text style={styles.loadingText}>Ride not found</Text>
          </View>
        </View>
      </View>
    );
  }

  const participants = ride.participants || [];

  const markerPositions = [
    { top: '40%', left: '45%' },
    { top: '35%', left: '55%' },
    { top: '48%', left: '38%' },
    { top: '30%', left: '50%' },
    { top: '45%', left: '60%' },
    { top: '38%', left: '42%' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <View style={styles.mapGrid} />
        <View style={styles.routeLine} />

        {participants.slice(0, 6).map((rider, i) => (
          <RiderMarker
            key={rider.id || i}
            initials={rider.initials}
            label={i === 0 ? 'Lead' : ROLE_LABELS[rider.role] || 'Rider'}
            color={MARKER_COLORS[i % MARKER_COLORS.length]}
            style={markerPositions[i]}
          />
        ))}

        <View style={styles.floatingHeader}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{ride.name}</Text>
            <Text style={styles.headerSubtitle}>{participants.length} RIDERS ACTIVE</Text>
          </View>
          <TouchableOpacity style={styles.endRideButton} onPress={endRide}>
            <Text style={styles.endRideText}>END</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sideControls}>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="compass" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="locate" size={24} color={colors.onSurface} />
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
            <Text style={styles.panelSubtitle}>{participants.length} riders connected</Text>
          </View>
        </View>

        <ScrollView style={styles.riderList}>
          {participants.map((rider, i) => (
            <View key={rider.id || i} style={styles.riderRow}>
              <View style={[styles.riderAvatar, i === 0 && styles.riderAvatarLead]}>
                <Text style={styles.riderAvatarText}>{rider.initials}</Text>
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>
                  {rider.display_name} {rider.user === user?.id && <Text style={styles.youBadge}>(You)</Text>}
                </Text>
                <Text style={styles.riderRole}>{ROLE_LABELS[rider.role] || rider.role}</Text>
              </View>
              <View style={styles.riderDistance}>
                <Text style={styles.distanceText}>{rider.status}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapContainer: { flex: 1, backgroundColor: colors.surfaceContainerLowest, position: 'relative', overflow: 'hidden' },
  mapGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.05 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.stackMd },
  loadingText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  routeLine: {
    position: 'absolute', top: '30%', left: '20%', width: '60%', height: 3,
    backgroundColor: colors.primaryContainer, borderRadius: 2, opacity: 0.8,
    transform: [{ rotate: '15deg' }],
  },
  marker: { position: 'absolute', alignItems: 'center' },
  markerDot: {
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: colors.background,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 4,
  },
  markerText: { ...typography.labelTechnical, color: colors.background, fontSize: 12, fontWeight: '700' },
  markerLabel: { ...typography.labelSm, color: colors.onSurface, marginTop: 4 },
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
  riderDistance: { alignItems: 'flex-end' },
  distanceText: { ...typography.labelTechnical, color: colors.onSurface },
});
