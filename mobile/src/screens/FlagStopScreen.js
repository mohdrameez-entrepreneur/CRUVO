import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';

const STOP_TYPES = [
  { key: 'FUEL', icon: 'car', label: 'Fuel' },
  { key: 'FOOD', icon: 'restaurant', label: 'Food' },
  { key: 'BREAK', icon: 'pause-circle', label: 'Break' },
  { key: 'GENERAL', icon: 'ellipsis-horizontal', label: 'General' },
  { key: 'ISSUE', icon: 'warning', label: 'Issue' },
];

export default function FlagStopScreen({ navigation }) {
  const [selected, setSelected] = useState('FUEL');

  return (
    <View style={styles.container}>
      {/* Map background */}
      <View style={styles.mapBackground}>
        <View style={styles.mapGrid} />
      </View>

      {/* Backdrop */}
      <View style={styles.backdrop} />

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <Text style={styles.sheetTitle}>Flag a stop?</Text>
        <Text style={styles.sheetSubtitle}>Let the crew know you need to pull over</Text>

        <View style={styles.bentoGrid}>
          {STOP_TYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[styles.stopCard, selected === type.key && styles.stopCardActive]}
              onPress={() => setSelected(type.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={type.icon}
                size={28}
                color={selected === type.key ? colors.onPrimaryContainer : colors.onSurfaceVariant}
              />
              <Text style={[styles.stopLabel, selected === type.key && styles.stopLabelActive]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.flagButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="flag" size={20} color={colors.white} />
            <Text style={styles.flagText}>Flag Stop</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.surfaceContainerLowest },
  mapGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.05 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surfaceContainerLow, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.marginMobile, paddingBottom: 34,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant, alignSelf: 'center', marginVertical: spacing.stackMd },
  sheetTitle: { ...typography.headlineLgMobile, color: colors.onSurface, marginBottom: spacing.stackSm },
  sheetSubtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.stackLg },
  bentoGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.stackSm, marginBottom: spacing.stackLg,
  },
  stopCard: {
    width: '48%', aspectRatio: 1.8, backgroundColor: colors.surfaceContainer,
    borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center', gap: spacing.stackSm,
  },
  stopCardActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  stopLabel: { ...typography.labelTechnical, color: colors.onSurfaceVariant },
  stopLabelActive: { color: colors.onPrimaryContainer },
  buttonRow: { flexDirection: 'row', gap: spacing.stackMd },
  cancelButton: {
    flex: 1, height: spacing.touchTargetMin, borderWidth: 2, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center',
  },
  cancelText: { ...typography.labelTechnical, color: colors.onSurface },
  flagButton: {
    flex: 2, height: spacing.touchTargetMin, backgroundColor: colors.error,
    borderRadius: borderRadius.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.stackSm,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 0, elevation: 4,
  },
  flagText: { ...typography.titleMd, color: colors.white, textTransform: 'uppercase' },
});
