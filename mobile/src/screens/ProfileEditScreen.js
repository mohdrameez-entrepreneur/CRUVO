import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, borderRadius, scale, moderateScale } from '../theme';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RIDING_STYLES = ['ADVENTURE', 'SPORT', 'TOURING', 'CRUISE', 'COMMUTE'];
const EXPERIENCE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'VETERAN', 'EXPERT'];

export default function ProfileEditScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { profile, user, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    display_name: '', bio: '', bike_make: '', bike_model: '',
    riding_style: '', experience_level: '', location_city: '', phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [modal, setModal] = useState(null);
  const [modalValue, setModalValue] = useState('');
  const [modalPassword, setModalPassword] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

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

  const getInitials = () => {
    const source = form.display_name || profile?.display_name || profile?.username || '?';
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
  };

  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to change your avatar.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('avatar', {
        uri: asset.uri,
        name: asset.fileName || 'avatar.jpg',
        type: asset.mimeType || 'image/jpeg',
      });

      setUploadingAvatar(true);
      await profileAPI.uploadAvatar(formData);
      await refreshProfile();
      Alert.alert('Success', 'Avatar updated');
    } catch (err) {
      console.log('AVATAR UPLOAD ERROR:', err.message, err.response?.data);
      const msg = err.response?.data;
      if (msg && typeof msg === 'object') {
        const firstError = Object.values(msg)[0];
        Alert.alert('Error', Array.isArray(firstError) ? firstError[0] : String(firstError));
      } else {
        Alert.alert('Error', 'Failed to upload avatar');
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const openAccountModal = (type) => {
    const currentValue = type === 'username'
      ? (user?.username || '')
      : (user?.email || '');
    setModalValue(currentValue);
    setModalPassword('');
    setModal(type);
  };

  const closeAccountModal = () => {
    if (!modalLoading) setModal(null);
  };

  const handleAccountSubmit = async () => {
    if (!modal) return;
    if (!modalValue.trim()) {
      Alert.alert('Error', modal === 'username' ? 'Username is required' : 'Email is required');
      return;
    }
    if (!modalPassword) {
      Alert.alert('Error', 'Please enter your password to confirm');
      return;
    }
    setModalLoading(true);
    try {
      if (modal === 'username') {
        await profileAPI.changeUsername({ username: modalValue.trim(), password: modalPassword });
      } else {
        await profileAPI.changeEmail({ email: modalValue.trim(), password: modalPassword });
      }
      await refreshProfile();
      setModal(null);
      Alert.alert('Success', `${modal === 'username' ? 'Username' : 'Email'} updated successfully`);
    } catch (err) {
      console.log('ACCOUNT CHANGE ERROR:', err.message, err.response?.data);
      const msg = err.response?.data;
      let message = `Failed to update ${modal}`;
      if (msg && typeof msg === 'object') {
        const firstError = Object.values(msg)[0];
        message = Array.isArray(firstError) ? firstError[0] : String(firstError);
      }
      Alert.alert('Error', message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.display_name) {
      Alert.alert('Error', 'Display name is required');
      return;
    }
    setLoading(true);
    try {
      await profileAPI.update(form);
      await refreshProfile();
      navigation.goBack();
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

  const renderSectionHeader = (title) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );

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
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.topBarButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>EDIT PROFILE</Text>
        <TouchableOpacity style={styles.topBarButton} onPress={handleSave} disabled={loading}>
          <Text style={styles.saveText}>{loading ? '...' : 'SAVE'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderSectionHeader('PROFILE PHOTO')}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8} disabled={uploadingAvatar}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{getInitials()}</Text>
              </View>
            )}
            <View style={styles.avatarOverlay}>
              <Ionicons name={uploadingAvatar ? undefined : 'camera'} size={14} color={colors.black} />
              {uploadingAvatar && <ActivityIndicator size="small" color={colors.black} />}
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>{uploadingAvatar ? 'UPLOADING...' : 'TAP TO CHANGE PHOTO'}</Text>
        </View>

        {renderSectionHeader('ACCOUNT')}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>USERNAME</Text>
          <TouchableOpacity style={styles.inputContainer} onPress={() => openAccountModal('username')} activeOpacity={0.8}>
            <Ionicons name="at-outline" size={20} color={colors.onSurfaceVariant} style={styles.inputIcon} />
            <Text style={[styles.input]} numberOfLines={1}>{profile?.username || 'Set username'}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>EMAIL</Text>
          <TouchableOpacity style={styles.inputContainer} onPress={() => openAccountModal('email')} activeOpacity={0.8}>
            <Ionicons name="mail-outline" size={20} color={colors.onSurfaceVariant} style={styles.inputIcon} />
            <Text style={[styles.input]} numberOfLines={1}>{profile?.email || 'Set email'}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {renderSectionHeader('PERSONAL DETAILS')}
        {renderInput('person-outline', 'display_name', 'Your name')}
        {renderInput('document-text-outline', 'bio', 'Tell other riders about yourself', { multiline: true })}
        {renderInput('call-outline', 'phone', '+1 234 567 890', { keyboardType: 'phone-pad' })}
        {renderInput('location-outline', 'location_city', 'e.g. Mumbai, India')}

        {renderSectionHeader('YOUR BIKE')}
        {renderInput('bicycle-outline', 'bike_make', 'e.g. Royal Enfield')}
        {renderInput('bicycle-outline', 'bike_model', 'e.g. Himalayan 450')}

        {renderSectionHeader('RIDING PROFILE')}
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

      <Modal visible={modal !== null} transparent animationType="fade" onRequestClose={closeAccountModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modal === 'username' ? 'CHANGE USERNAME' : 'CHANGE EMAIL'}</Text>
            <Text style={styles.modalSubtitle}>Enter your password to confirm this change.</Text>

            <Text style={styles.label}>{modal === 'username' ? 'NEW USERNAME' : 'NEW EMAIL'}</Text>
            <View style={[styles.inputContainer, styles.modalInput]}>
              <Ionicons
                name={modal === 'username' ? 'at-outline' : 'mail-outline'}
                size={20}
                color={colors.onSurfaceVariant}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder={modal === 'username' ? 'New username' : 'New email'}
                placeholderTextColor={colors.outline}
                value={modalValue}
                onChangeText={setModalValue}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={modal === 'email' ? 'email-address' : 'default'}
              />
            </View>

            <Text style={styles.label}>PASSWORD</Text>
            <View style={[styles.inputContainer, styles.modalInput]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Current password"
                placeholderTextColor={colors.outline}
                value={modalPassword}
                onChangeText={setModalPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={closeAccountModal} disabled={modalLoading}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, modalLoading && styles.saveButtonDisabled]}
                onPress={handleAccountSubmit}
                disabled={modalLoading}
              >
                <Text style={styles.modalConfirmText}>{modalLoading ? 'SAVING...' : 'CONFIRM'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, minHeight: spacing.touchTargetMin, paddingTop: 0,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  topBarButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { ...typography.headlineLgMobile, color: colors.primaryContainer, fontSize: 20, textTransform: 'uppercase', letterSpacing: -0.5 },
  saveText: { ...typography.labelTechnical, color: colors.primaryContainer },
  content: { flex: 1 },
  contentContainer: { padding: spacing.marginMobile, paddingBottom: 100 },
  avatarSection: { alignItems: 'center', marginBottom: spacing.stackLg },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { ...typography.titleMd, color: colors.onSurface },
  avatarOverlay: {
    position: 'absolute', bottom: -2, right: -2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.background,
  },
  avatarHint: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: spacing.stackMd, letterSpacing: 1 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: spacing.stackLg, marginBottom: spacing.stackMd, gap: spacing.stackMd,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: colors.outlineVariant },
  sectionTitle: { ...typography.labelTechnical, color: colors.onSurfaceVariant },
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
    marginTop: spacing.stackLg,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { ...typography.titleMd, color: colors.onPrimaryContainer, textTransform: 'uppercase' },
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCard: {
    width: '88%', backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xl, padding: spacing.stackMd,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  modalTitle: { ...typography.titleMd, color: colors.onSurface, textAlign: 'center', marginBottom: spacing.stackSm, textTransform: 'uppercase' },
  modalSubtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.stackMd },
  modalInput: { marginBottom: spacing.stackMd },
  modalButtonRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    gap: spacing.stackMd, marginTop: spacing.stackSm,
  },
  modalCancelButton: {
    flex: 1, height: spacing.touchTargetMin,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant,
    justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceContainerLow,
  },
  modalConfirmButton: {
    flex: 1, height: spacing.touchTargetMin,
    borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.primaryContainer,
  },
  modalCancelText: { ...typography.labelTechnical, color: colors.onSurfaceVariant },
  modalConfirmText: { ...typography.labelTechnical, color: colors.onPrimaryContainer },
});
