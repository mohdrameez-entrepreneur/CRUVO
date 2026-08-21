import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';

const { width, height } = Dimensions.get('window');

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

export default function ActiveRideScreen({ navigation }) {
  const [panelExpanded, setPanelExpanded] = useState(false);

  const riders = [
    { initials: 'RZ', name: 'Rameez', role: 'Lead', distance: '0m', speed: '85 km/h' },
    { initials: 'AY', name: 'Ayaan', role: 'Wingman', distance: '+120m', speed: '82 km/h' },
    { initials: 'DN', name: 'Danish', role: 'Sweep', distance: '-80m', speed: '78 km/h' },
  ];

  return (
    <View style={styles.container}>
      {/* Map placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.mapGrid} />

        {/* Route line */}
        <View style={styles.routeLine} />

        {/* Rider markers */}
        <RiderMarker initials="RZ" label="Lead" color={colors.primaryContainer} style={{ top: '40%', left: '45%' }} />
        <RiderMarker initials="AY" label="+120m" color={colors.secondary} style={{ top: '35%', left: '52%' }} />
        <RiderMarker initials="DN" label="-80m" color={colors.tertiary} style={{ top: '45%', left: '38%' }} />

        {/* Floating header */}
        <View style={styles.floatingHeader}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Sunday Morning Ride</Text>
            <Text style={styles.headerSubtitle}>3 RIDERS ACTIVE</Text>
          </View>
          <TouchableOpacity
            style={styles.endRideButton}
            onPress={() => navigation.navigate('RideSummary')}
          >
            <Text style={styles.endRideText}>END</Text>
          </TouchableOpacity>
        </View>

        {/* Side controls */}
        <View style={styles.sideControls}>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="compass" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="locate" size={24} color={colors.onSurface} />
          </TouchableOpacity>
        </View>

        {/* Flag Stop FAB */}
        <TouchableOpacity
          style={styles.flagFab}
          onPress={() => navigation.navigate('FlagStop')}
        >
          <Ionicons name="flag" size={28} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Bottom panel */}
      <View style={[styles.bottomPanel, panelExpanded && styles.bottomPanelExpanded]}>
        <TouchableOpacity
          style={styles.panelHandle}
          onPress={() => setPanelExpanded(!panelExpanded)}
        >
          <View style={styles.handleBar} />
        </TouchableOpacity>

        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelTitle}>Rider Roster</Text>
            <Text style={styles.panelSubtitle}>{riders.length} riders connected</Text>
          </View>
          <View style={styles.speedBadge}>
            <Ionicons name="speedometer" size={16} color={colors.primaryContainer} />
            <Text style={styles.speedText}>85 KM/H</Text>
          </View>
        </View>

        <ScrollView style={styles.riderList}>
          {riders.map((rider, i) => (
            <View key={i} style={styles.riderRow}>
              <View style={[styles.riderAvatar, i === 0 && styles.riderAvatarLead]}>
                <Text style={styles.riderAvatarText}>{rider.initials}</Text>
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>
                  {rider.name} {i === 0 && <Text style={styles.youBadge}>(You)</Text>}
                </Text>
                <Text style={styles.riderRole}>{rider.role}</Text>
              </View>
              <View style={styles.riderDistance}>
                <Text style={styles.distanceText}>{rider.distance}</Text>
                <Text style={styles.speedSmall}>{rider.speed}</Text>
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
  mapGrid: {
    ...StyleSheet.absoluteFillObject, opacity: 0.05,
  },
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
    position: 'absolute', right: spacing.marginMobile, top: '50%',
    gap: spacing.stackSm,
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
  speedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  speedText: { ...typography.labelTechnical, color: colors.primaryContainer },
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
  speedSmall: { ...typography.labelSm, color: colors.onSurfaceVariant },
});
