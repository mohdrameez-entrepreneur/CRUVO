import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Switch, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, typography, borderRadius } from '../theme';
import { ridesAPI } from '../api';
import LocationPicker from '../components/LocationPicker';

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function formatTime(d) {
  return d.toTimeString().slice(0, 5);
}

export default function CreateRideScreen({ navigation }) {
  const [form, setForm] = useState({
    name: '', is_public: false,
  });
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(false);

  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [scheduledTime, setScheduledTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleCreate = async () => {
    if (!form.name || !origin || !destination) {
      Alert.alert('Error', 'Please fill in all fields and select locations');
      return;
    }

    const now = new Date();
    const dateStr = isScheduled ? formatDate(scheduledDate) : formatDate(now);
    const timeStr = isScheduled ? formatTime(scheduledTime) : formatTime(now);

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        origin_name: origin.name,
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_name: destination.name,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        date: dateStr,
        time: timeStr,
        is_public: form.is_public,
      };
      const res = await ridesAPI.create(payload);
      const newRide = res.data;
      Alert.alert(
        'Ride Created',
        `"${newRide.name}" has been ${isScheduled ? 'scheduled' : 'created'}!`,
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

  const onDateChange = (event, selectedDate) => {
    if (selectedDate) {
      setScheduledDate(selectedDate);
    }
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    if (selectedTime) {
      setScheduledTime(selectedTime);
    }
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
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

        <LocationPicker
          label="ORIGIN"
          icon="location-outline"
          placeholder="Search starting point..."
          value={origin?.name}
          onSelect={setOrigin}
        />

        <LocationPicker
          label="DESTINATION"
          icon="search"
          placeholder="Search destination..."
          value={destination?.name}
          onSelect={setDestination}
        />

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Ionicons name="calendar-outline" size={20} color={colors.onSurfaceVariant} />
            <View>
              <Text style={styles.toggleLabel}>Schedule Ride</Text>
              <Text style={styles.toggleSubtext}>{isScheduled ? 'Set a future date & time' : 'Start ride now'}</Text>
            </View>
          </View>
          <Switch
            value={isScheduled}
            onValueChange={setIsScheduled}
            trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
            thumbColor={isScheduled ? colors.onPrimaryContainer : colors.onSurface}
          />
        </View>

        {isScheduled && (
          <View style={styles.dateTimePickerRow}>
            <TouchableOpacity
              style={[styles.pickerButton, { flex: 1 }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primaryContainer} />
              <Text style={styles.pickerButtonText}>{formatDate(scheduledDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pickerButton, { flex: 1 }]}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={18} color={colors.primaryContainer} />
              <Text style={styles.pickerButtonText}>{formatTime(scheduledTime)}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isScheduled && (
          <View style={styles.startNowBadge}>
            <Ionicons name="play-circle" size={20} color={colors.primaryContainer} />
            <Text style={styles.startNowText}>Ride starts immediately with current date & time</Text>
          </View>
        )}

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

        {showDatePicker && (
          <DateTimePicker
            value={scheduledDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
            themeVariant="dark"
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={scheduledTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
            themeVariant="dark"
          />
        )}

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabled]}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name={isScheduled ? "calendar" : "navigate"} size={24} color={colors.onPrimaryContainer} />
          <Text style={styles.primaryButtonText}>
            {loading ? 'Creating...' : isScheduled ? 'Save Ride' : 'Start Ride Now'}
          </Text>
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
    borderRadius: borderRadius.lg, padding: spacing.stackMd, marginBottom: spacing.stackMd,
  },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd, flex: 1 },
  toggleLabel: { ...typography.titleMd, color: colors.onSurface, fontSize: 16 },
  toggleSubtext: { ...typography.labelSm, color: colors.onSurfaceVariant },
  dateTimePickerRow: {
    flexDirection: 'row', gap: spacing.stackMd, marginBottom: spacing.stackMd,
  },
  pickerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm,
    backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.primaryContainer,
    borderRadius: borderRadius.lg, height: spacing.touchTargetMin,
  },
  pickerButtonText: {
    ...typography.titleMd, color: colors.primaryContainer, fontSize: 15,
  },
  startNowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm,
    backgroundColor: colors.primaryContainer + '20', borderRadius: borderRadius.lg,
    padding: spacing.stackMd, marginBottom: spacing.stackMd,
    borderWidth: 1, borderColor: colors.primaryContainer + '50',
  },
  startNowText: { ...typography.bodyMd, color: colors.primaryContainer, flex: 1 },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm,
    backgroundColor: colors.primaryContainer, height: 56, borderRadius: borderRadius.lg,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 0, elevation: 4,
  },
  disabled: { opacity: 0.6 },
  primaryButtonText: { ...typography.titleMd, color: colors.onPrimaryContainer, textTransform: 'uppercase' },
});
