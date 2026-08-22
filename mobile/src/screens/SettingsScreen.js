import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, scale, moderateScale } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={colors.onSurfaceVariant} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not set'}</Text>
      </View>
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { profile, user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await logout();
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.topBarButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>SETTINGS</Text>
        <View style={styles.topBarButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.profileSection}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarLarge} />
          ) : (
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarInitials}>{profile?.initials || '??'}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{profile?.display_name || 'Rider'}</Text>
          <Text style={styles.profileUsername}>@{user?.username || ''}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>RIDER PROFILE</Text>
          <InfoRow icon="person-outline" label="Display Name" value={profile?.display_name} />
          <InfoRow icon="call-outline" label="Phone" value={profile?.phone} />
          <InfoRow icon="location-outline" label="Location" value={profile?.location_city} />
          <InfoRow icon="bicycle-outline" label="Bike" value={`${profile?.bike_make || ''} ${profile?.bike_model || ''}`.trim()} />
          <InfoRow icon="speedometer-outline" label="Style" value={profile?.riding_style} />
          <InfoRow icon="trophy-outline" label="Experience" value={profile?.experience_level} />
          {profile?.bio ? <InfoRow icon="document-text-outline" label="Bio" value={profile.bio} /> : null}
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('ProfileEdit')}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={20} color={colors.onPrimaryContainer} />
          <Text style={styles.editButtonText}>EDIT PROFILE</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>ACCOUNT</Text>
          <InfoRow icon="at-outline" label="Username" value={`@${user?.username}`} />
          <InfoRow icon="mail-outline" label="Email" value={user?.email} />
          <InfoRow icon="key-outline" label="User ID" value={`#${user?.id || profile?.id}`} />
          <InfoRow icon="calendar-outline" label="Joined" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ''} />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#F44336" />
          <Text style={styles.logoutText}>LOG OUT</Text>
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
  contentContainer: { padding: spacing.marginMobile, paddingBottom: 100 },
  profileSection: { alignItems: 'center', marginBottom: spacing.stackLg, gap: spacing.stackSm },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.primaryContainer,
  },
  avatarInitials: { ...typography.headlineLgMobile, color: colors.primaryContainer },
  profileName: { ...typography.headlineLgMobile, color: colors.onSurface },
  profileUsername: { ...typography.labelTechnical, color: colors.primaryContainer },
  profileEmail: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  card: {
    backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.xl, padding: spacing.stackMd, marginBottom: spacing.stackMd,
  },
  cardTitle: { ...typography.labelTechnical, color: colors.primaryContainer, marginBottom: spacing.stackMd },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd,
    paddingVertical: spacing.stackSm, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  infoText: { flex: 1 },
  infoLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  infoValue: { ...typography.bodyMd, color: colors.onSurface },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm,
    borderWidth: 1, borderColor: '#F44336', borderRadius: borderRadius.lg, height: spacing.touchTargetMin,
    marginTop: spacing.stackMd,
  },
  logoutText: { ...typography.titleMd, color: '#F44336', textTransform: 'uppercase' },
  editButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm,
    backgroundColor: colors.primaryContainer, height: spacing.touchTargetMin,
    borderRadius: borderRadius.lg, marginTop: spacing.stackMd,
  },
  editButtonText: { ...typography.titleMd, color: colors.onPrimaryContainer, textTransform: 'uppercase' },
});
