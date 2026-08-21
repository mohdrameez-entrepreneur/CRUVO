import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';

const { width } = Dimensions.get('window');

const stats = [
  { label: 'Duration', value: '2h 15m', icon: 'time' },
  { label: 'Distance', value: '42.3 km', icon: 'route' },
  { label: 'Riders', value: '3', icon: 'people' },
  { label: 'Stops', value: '2', icon: 'flag' },
];

const riders = [
  { name: 'Rameez', role: 'Lead Navigator', status: 'verified', initials: 'RZ' },
  { name: 'Mike T.', role: 'Wingman', status: 'completed', initials: 'MT' },
  { name: 'Sarah J.', role: 'Sweep', status: 'completed', initials: 'SJ' },
];

export default function RideSummaryScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topBarButton} />
        <Text style={styles.topBarTitle}>CRUVO</Text>
        <View style={styles.topBarButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="checkmark-circle" size={48} color={colors.primaryContainer} />
          <Text style={styles.headerTitle}>Ride Completed</Text>
        </View>

        {/* Map overview placeholder */}
        <View style={styles.mapOverview}>
          <View style={styles.mapGrid} />
          <View style={styles.finishFlag}>
            <Ionicons name="flag" size={32} color={colors.primaryContainer} />
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons name={stat.icon} size={24} color={colors.primaryContainer} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        {/* Squad list */}
        <View style={styles.squadSection}>
          <Text style={styles.sectionTitle}>Squad</Text>
          {riders.map((rider, i) => (
            <View key={i} style={styles.riderRow}>
              <View style={[styles.riderAvatar, i === 0 && styles.riderAvatarLead]}>
                <Text style={styles.riderInitials}>{rider.initials}</Text>
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>
                  {rider.name} {i === 0 && <Text style={styles.youBadge}>(You)</Text>}
                </Text>
                <Text style={styles.riderRole}>{rider.role}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Ionicons
                  name={rider.status === 'verified' ? 'checkmark-circle' : 'checkmark-done-circle'}
                  size={16}
                  color={rider.status === 'verified' ? colors.primaryContainer : colors.onSurfaceVariant}
                />
                <Text style={[styles.statusText, rider.status === 'verified' && styles.statusTextActive]}>
                  {rider.status === 'verified' ? 'Verified' : 'Completed'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Fixed bottom */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => navigation.navigate('Main')}
          activeOpacity={0.8}
        >
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
    paddingHorizontal: spacing.marginMobile, height: spacing.touchTargetMin,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  topBarButton: { width: 48, height: 48 },
  topBarTitle: { ...typography.displayLg, color: colors.primaryContainer, fontSize: 24, textTransform: 'uppercase', letterSpacing: -0.8 },
  content: { padding: spacing.marginMobile, paddingBottom: 100 },
  header: { alignItems: 'center', gap: spacing.stackSm, marginBottom: spacing.stackLg },
  headerTitle: { ...typography.headlineLgMobile, color: colors.onSurface },
  mapOverview: {
    height: 200, backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden', marginBottom: spacing.stackLg, position: 'relative',
  },
  mapGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.05 },
  finishFlag: { position: 'absolute', bottom: spacing.stackMd, right: spacing.stackMd },
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
  riderAvatarLead: { backgroundColor: colors.primaryContainer },
  riderInitials: { ...typography.labelTechnical, color: colors.onSurface },
  riderInfo: { flex: 1 },
  riderName: { ...typography.bodyMd, color: colors.onSurface },
  youBadge: { ...typography.labelSm, color: colors.primaryContainer },
  riderRole: { ...typography.labelSm, color: colors.onSurfaceVariant },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  statusTextActive: { color: colors.primaryContainer },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.marginMobile, paddingBottom: 34,
    backgroundColor: colors.surfaceContainerLowest, borderTopWidth: 1, borderTopColor: colors.outlineVariant,
  },
  doneButton: {
    backgroundColor: colors.primaryContainer, height: spacing.touchTargetMin, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 0, elevation: 4,
  },
  doneText: { ...typography.titleMd, color: colors.onPrimaryContainer, textTransform: 'uppercase' },
});
