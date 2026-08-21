import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';
import { ridesAPI } from '../api';

export default function CreateRideScreen({ navigation }) {
  const [form, setForm] = useState({
    name: '', origin_name: '', destination_name: '',
    date: '', time: '', is_public: false,
  });
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleCreate = async () => {
    if (!form.name || !form.origin_name || !form.destination_name || !form.date || !form.time) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await ridesAPI.create(form);
      const newRide = res.data;
      Alert.alert(
        'Ride Created',
        `"${newRide.name}" has been scheduled!`,
        [
          {
            text: 'Invite Riders',
            onPress: () => navigation.replace('InviteRiders', { rideId: newRide.id, rideName: newRide.name }),
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (err) {
      console.log('CREATE RIDE ERROR:', err.message, err.response?.data);
      const msg = err.response?.data;
      if (msg && typeof msg === 'object') {
        const firstError = Object.values(msg)[0];
        Alert.alert('Error', Array.isArray(firstError) ? firstError[0] : String(firstError));
      } else {
        Alert.alert('Error', 'Failed to create ride');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>CRUVO</Text>
        <View style={styles.topBarButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Create a Ride</Text>
        <Text style={styles.subtitle}>Plan your route and invite riders</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>RIDE DESIGNATION</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="flag-outline" size={20} color={colors.onSurfaceVariant} />
            <TextInput
              style={styles.input}
              placeholder="Sunday Morning Ride"
              placeholderTextColor={colors.outline}
              value={form.name}
              onChangeText={(v) => update('name', v)}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ORIGIN</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color={colors.onSurfaceVariant} />
            <TextInput
              style={styles.input}
              placeholder="Starting point"
              placeholderTextColor={colors.outline}
              value={form.origin_name}
              onChangeText={(v) => update('origin_name', v)}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>DESTINATION</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="search" size={20} color={colors.onSurfaceVariant} />
            <TextInput
              style={styles.input}
              placeholder="End point"
              placeholderTextColor={colors.outline}
              value={form.destination_name}
              onChangeText={(v) => update('destination_name', v)}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>DATE</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="calendar-outline" size={20} color={colors.onSurfaceVariant} />
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.outline}
                value={form.date}
                onChangeText={(v) => update('date', v)}
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>TIME</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="time-outline" size={20} color={colors.onSurfaceVariant} />
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                placeholderTextColor={colors.outline}
                value={form.time}
                onChangeText={(v) => update('time', v)}
              />
            </View>
          </View>
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Ionicons name="eye-outline" size={20} color={colors.onSurfaceVariant} />
            <View>
              <Text style={styles.toggleLabel}>Visibility</Text>
              <Text style={styles.toggleSubtext}>{form.is_public ? 'Public - Anyone can join' : 'Private - Invite only'}</Text>
            </View>
          </View>
          <Switch
            value={form.is_public}
            onValueChange={(v) => update('is_public', v)}
            trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
            thumbColor={form.is_public ? colors.onPrimaryContainer : colors.onSurface}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabled]}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate" size={24} color={colors.onPrimaryContainer} />
          <Text style={styles.primaryButtonText}>{loading ? 'Creating...' : 'Create Ride'}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  topBarButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { ...typography.displayLg, color: colors.primaryContainer, fontSize: 24, textTransform: 'uppercase', letterSpacing: -0.8 },
  content: { flex: 1 },
  contentContainer: { padding: spacing.marginMobile, paddingBottom: spacing.stackLg },
  title: { ...typography.headlineLgMobile, color: colors.onSurface, marginBottom: spacing.stackSm },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.stackLg },
  inputGroup: { marginBottom: spacing.stackMd },
  label: { ...typography.labelTechnical, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.lg,
    height: spacing.touchTargetMin, paddingHorizontal: spacing.stackMd, gap: spacing.stackSm,
  },
  input: { flex: 1, ...typography.bodyMd, color: colors.onSurface },
  row: { flexDirection: 'row', gap: spacing.stackMd },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg, padding: spacing.stackMd, marginBottom: spacing.stackLg,
  },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd, flex: 1 },
  toggleLabel: { ...typography.titleMd, color: colors.onSurface, fontSize: 16 },
  toggleSubtext: { ...typography.labelSm, color: colors.onSurfaceVariant },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm,
    backgroundColor: colors.primaryContainer, height: 56, borderRadius: borderRadius.lg,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 0, elevation: 4,
  },
  disabled: { opacity: 0.6 },
  primaryButtonText: { ...typography.titleMd, color: colors.onPrimaryContainer, textTransform: 'uppercase' },
});
