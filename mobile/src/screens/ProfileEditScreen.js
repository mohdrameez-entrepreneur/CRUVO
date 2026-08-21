import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../api';

const RIDING_STYLES = ['ADVENTURE', 'SPORT', 'TOURING', 'CRUISE', 'COMMUTE'];
const EXPERIENCE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'VETERAN', 'EXPERT'];

export default function ProfileEditScreen({ navigation }) {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    display_name: '', bio: '', bike_make: '', bike_model: '',
    riding_style: '', experience_level: '', location_city: '', phone: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        bike_make: profile.bike_make || '',
        bike_model: profile.bike_model || '',
        riding_style: profile.riding_style || '',
        experience_level: profile.experience_level || '',
        location_city: profile.location_city || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.display_name) {
      Alert.alert('Error', 'Display name is required');
      return;
    }
    setLoading(true);
    try {
      await profileAPI.update(form);
      await refreshProfile();
      Alert.alert('Saved', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.log('PROFILE UPDATE ERROR:', err.message, err.response?.data);
      const msg = err.response?.data;
      if (msg && typeof msg === 'object') {
        const firstError = Object.values(msg)[0];
        Alert.alert('Error', Array.isArray(firstError) ? firstError[0] : String(firstError));
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (icon, key, placeholder, options = {}) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
      <View style={styles.inputContainer}>
        <Ionicons name={icon} size={20} color={colors.onSurfaceVariant} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.outline}
          value={form[key]}
          onChangeText={(v) => update(key, v)}
          keyboardType={options.keyboardType || 'default'}
          autoCapitalize="none"
          multiline={options.multiline}
          numberOfLines={options.multiline ? 3 : 1}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>EDIT PROFILE</Text>
        <TouchableOpacity style={styles.topBarButton} onPress={handleSave} disabled={loading}>
          <Text style={styles.saveText}>{loading ? '...' : 'SAVE'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderInput('person-outline', 'display_name', 'Your name')}
        {renderInput('document-text-outline', 'bio', 'Tell other riders about yourself', { multiline: true })}
        {renderInput('call-outline', 'phone', '+1 234 567 890', { keyboardType: 'phone-pad' })}
        {renderInput('location-outline', 'location_city', 'e.g. Mumbai, India')}
        {renderInput('bicycle-outline', 'bike_make', 'e.g. Royal Enfield')}
        {renderInput('bicycle-outline', 'bike_model', 'e.g. Himalayan 450')}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>RIDING STYLE</Text>
          <View style={styles.chipContainer}>
            {RIDING_STYLES.map(style => (
              <TouchableOpacity
                key={style}
                style={[styles.chip, form.riding_style === style && styles.chipActive]}
                onPress={() => update('riding_style', form.riding_style === style ? '' : style)}
              >
                <Text style={[styles.chipText, form.riding_style === style && styles.chipTextActive]}>{style}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>EXPERIENCE</Text>
          <View style={styles.chipContainer}>
            {EXPERIENCE_LEVELS.map(level => (
              <TouchableOpacity
                key={level}
                style={[styles.chip, form.experience_level === level && styles.chipActive]}
                onPress={() => update('experience_level', form.experience_level === level ? '' : level)}
              >
                <Text style={[styles.chipText, form.experience_level === level && styles.chipTextActive]}>{level}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>{loading ? 'SAVING...' : 'SAVE CHANGES'}</Text>
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
  topBarTitle: { ...typography.displayLg, color: colors.primaryContainer, fontSize: 20, textTransform: 'uppercase', letterSpacing: -0.5 },
  saveText: { ...typography.labelTechnical, color: colors.primaryContainer },
  content: { flex: 1 },
  contentContainer: { padding: spacing.marginMobile, paddingBottom: 100 },
  inputGroup: { marginBottom: spacing.stackMd },
  label: { ...typography.labelTechnical, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.lg,
    minHeight: spacing.touchTargetMin, paddingHorizontal: spacing.stackMd, gap: spacing.stackSm,
  },
  inputIcon: { marginRight: spacing.stackSm },
  input: { flex: 1, ...typography.bodyMd, color: colors.onSurface, paddingVertical: spacing.stackSm },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackSm,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  chipActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  chipText: { ...typography.labelTechnical, color: colors.onSurfaceVariant, fontSize: 12 },
  chipTextActive: { color: colors.onPrimaryContainer },
  saveButton: {
    backgroundColor: colors.primaryContainer, height: spacing.touchTargetMin,
    borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center',
    marginTop: spacing.stackMd,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { ...typography.titleMd, color: colors.onPrimaryContainer, textTransform: 'uppercase' },
});
