import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, moderateScale } from '../theme';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';
import GlassModal from '../components/GlassModal';
import UserAvatar from '../components/UserAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function SettingsSection({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function SettingRow({ icon, label, value, onPress, isLast = false, rightElement, iconColor = colors.primaryContainer }) {
  const content = (
    <View style={[styles.settingRow, isLast && styles.settingRowLast]}>
      <View style={[styles.iconWrap, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
      </View>
      {rightElement || (onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />
      ) : null)}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, profile, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const bikeDisplay = [profile?.bike_make, profile?.bike_model].filter(Boolean).join(' ') || 'Not specified';
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '2026';

  return (
    <View style={styles.container}>
      <NavBar
        title="SETTINGS"
        subtitle="PREFERENCES & ACCOUNT"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.avatarBorder}>
              <UserAvatar
                avatarUrl={profile?.avatar_url}
                name={profile?.display_name}
                initials={profile?.initials}
                id={profile?.user_id}
                size={68}
              />
            </View>

            <View style={styles.heroInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {profile?.display_name || 'Rider'}
                </Text>
                <View style={styles.memberBadge}>
                  <Text style={styles.memberBadgeText}>MEMBER</Text>
                </View>
              </View>
              <Text style={styles.heroUsername}>@{user?.username || 'rider'}</Text>
              <Text style={styles.heroJoined}>Member since {joinedDate}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => navigation.navigate('ProfileEdit')}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={16} color={colors.onPrimaryContainer} />
            <Text style={styles.editProfileBtnText}>EDIT PROFILE & GARAGE</Text>
          </TouchableOpacity>
        </View>

        {/* Garage & Riding Style */}
        <SettingsSection title="GARAGE & RIDING STYLE">
          <SettingRow
            icon="speedometer-outline"
            label="Motorcycle"
            value={bikeDisplay}
            onPress={() => navigation.navigate('ProfileEdit')}
          />
          <SettingRow
            icon="compass-outline"
            label="Riding Style"
            value={profile?.riding_style || 'Not set'}
            onPress={() => navigation.navigate('ProfileEdit')}
          />
          <SettingRow
            icon="trophy-outline"
            label="Experience Level"
            value={profile?.experience_level || 'Not set'}
            isLast
            onPress={() => navigation.navigate('ProfileEdit')}
          />
        </SettingsSection>

        {/* Contact & Privacy Settings */}
        <SettingsSection title="CONTACT & VISIBILITY">
          <SettingRow
            icon="mail-outline"
            label="Email Privacy"
            value={profile?.is_email_public ? '👥 Visible to friends only' : '🔒 Kept private'}
            iconColor={profile?.is_email_public ? '#4CAF50' : colors.primaryContainer}
            onPress={() => navigation.navigate('ProfileEdit')}
            rightElement={
              <View style={[styles.privacyPill, profile?.is_email_public ? styles.pillPublic : styles.pillPrivate]}>
                <Text style={[styles.privacyPillText, profile?.is_email_public ? styles.pillTextPublic : styles.pillTextPrivate]}>
                  {profile?.is_email_public ? 'FRIENDS' : 'PRIVATE'}
                </Text>
              </View>
            }
          />
          <SettingRow
            icon="call-outline"
            label="Phone Privacy"
            value={profile?.is_phone_public ? '👥 Visible to friends only' : '🔒 Kept private'}
            iconColor={profile?.is_phone_public ? '#4CAF50' : colors.primaryContainer}
            isLast
            onPress={() => navigation.navigate('ProfileEdit')}
            rightElement={
              <View style={[styles.privacyPill, profile?.is_phone_public ? styles.pillPublic : styles.pillPrivate]}>
                <Text style={[styles.privacyPillText, profile?.is_phone_public ? styles.pillTextPublic : styles.pillTextPrivate]}>
                  {profile?.is_phone_public ? 'FRIENDS' : 'PRIVATE'}
                </Text>
              </View>
            }
          />
        </SettingsSection>

        {/* Account Details */}
        <SettingsSection title="ACCOUNT DETAILS">
          <SettingRow
            icon="at-outline"
            label="Username"
            value={`@${user?.username}`}
            onPress={() => navigation.navigate('ProfileEdit')}
          />
          <SettingRow
            icon="mail-outline"
            label="Account Email"
            value={user?.email || 'Not set'}
            onPress={() => navigation.navigate('ProfileEdit')}
          />
          <SettingRow
            icon="key-outline"
            label="Rider Identifier"
            value={`#${user?.id || profile?.id || '0'}`}
            isLast
          />
        </SettingsSection>

        {/* Legal & Security */}
        <SettingsSection title="LEGAL & SAFETY">
          <SettingRow
            icon="shield-checkmark-outline"
            label="Privacy Policy & Terms"
            value="Data protection & telemetry consent"
            isLast
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
        </SettingsSection>

        {/* App Version Info */}
        <View style={styles.versionWrap}>
          <Text style={styles.versionTitle}>CRUVO TELEMETRY ENGINE</Text>
          <Text style={styles.versionSub}>Version 1.2.0 • Squad Riding Platform</Text>
        </View>

        {/* Logout Action */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color="#ff5252" />
          <Text style={styles.logoutText}>LOG OUT</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <GlassModal
        visible={showLogoutModal}
        type="danger"
        icon="log-out-outline"
        badge="SESSION TERMINATION"
        title="Log Out of CRUVO?"
        message="Are you sure you want to end your current session? You can sign back in anytime with your credentials."
        confirmText="LOG OUT"
        cancelText="CANCEL"
        isLoading={loggingOut}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackSm,
  },
  heroCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.25)',
    borderRadius: borderRadius.xl,
    padding: spacing.stackMd + 2,
    marginBottom: spacing.stackLg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
  },
  avatarBorder: {
    borderWidth: 2,
    borderColor: colors.primaryContainer,
    borderRadius: 999,
    padding: 2,
  },
  heroInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroName: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontSize: moderateScale(16),
    fontWeight: '800',
    flexShrink: 1,
  },
  memberBadge: {
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.35)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  memberBadgeText: {
    ...typography.labelTechnical,
    color: colors.primaryContainer,
    fontSize: moderateScale(8),
    fontWeight: '800',
  },
  heroUsername: {
    ...typography.labelTechnical,
    color: colors.primaryContainer,
    fontSize: moderateScale(11),
  },
  heroJoined: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: moderateScale(10),
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryContainer,
    height: 42,
    borderRadius: borderRadius.lg,
    marginTop: spacing.stackMd,
  },
  editProfileBtnText: {
    ...typography.labelTechnical,
    color: colors.onPrimaryContainer,
    fontSize: moderateScale(11),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: spacing.stackLg,
  },
  sectionTitle: {
    ...typography.labelTechnical,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(11),
    letterSpacing: 0.8,
    marginBottom: spacing.stackSm,
    paddingLeft: 2,
  },
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackMd - 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: spacing.stackSm + 4,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInfo: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(11),
  },
  rowValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  privacyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  pillPublic: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: 'rgba(76, 175, 80, 0.35)',
  },
  pillPrivate: {
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    borderColor: 'rgba(255, 214, 0, 0.3)',
  },
  privacyPillText: {
    ...typography.labelTechnical,
    fontSize: moderateScale(9),
    fontWeight: '800',
  },
  pillTextPublic: {
    color: '#4CAF50',
  },
  pillTextPrivate: {
    color: colors.primaryContainer,
  },
  versionWrap: {
    alignItems: 'center',
    paddingVertical: spacing.stackMd,
    gap: 2,
  },
  versionTitle: {
    ...typography.labelTechnical,
    color: colors.outline,
    fontSize: moderateScale(10),
    letterSpacing: 1,
  },
  versionSub: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: moderateScale(10),
    opacity: 0.7,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.35)',
    height: 48,
    borderRadius: borderRadius.xl,
    marginTop: spacing.stackSm,
    marginBottom: spacing.stackLg,
  },
  logoutText: {
    ...typography.titleMd,
    color: '#ff5252',
    fontSize: moderateScale(13),
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});

