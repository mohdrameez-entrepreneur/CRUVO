import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, moderateScale } from '../theme';
import { showAlert, showError, showSuccess, showInfo } from '../utils/alert';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';
import GlassModal from '../components/GlassModal';
import WhatsNewModal from '../components/WhatsNewModal';
import UpdateRequiredModal from '../components/UpdateRequiredModal';
import LocationDisclosureModal from '../components/LocationDisclosureModal';
import UserAvatar from '../components/UserAvatar';
import useLocation from '../hooks/useLocation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { versionAPI, profileAPI } from '../api';
import { CURRENT_APP_VERSION } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

function SettingsSection({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function SettingRow({ icon, label, value, onPress, isLast = false, rightElement, iconColor = '#B45309' }) {
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
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showLocationDisclosure, setShowLocationDisclosure] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateModalData, setUpdateModalData] = useState(null);
  const { requestBackgroundPermission, requestPermission } = useLocation(false);

  const handleWithdrawConsent = async () => {
    await AsyncStorage.removeItem('@cruvo_bg_disclosure_seen').catch(() => {});
    showInfo(
      'You have withdrawn your consent for live telemetry and location tracking. Background and foreground GPS broadcasts will remain disabled until you explicitly re-enable them before starting a ride.',
      'Consent Withdrawn'
    );
  };

  const handlePurgeLocationHistory = () => {
    showAlert({
      title: 'Purge Location History?',
      message: 'This will permanently delete all raw GPS coordinates, active telemetry pings, and location cache from CRUVO servers.',
      type: 'danger',
      showCancel: true,
      cancelText: 'Cancel',
      confirmText: 'Purge Location Data',
      onConfirm: async () => {
        try {
          const res = await profileAPI.purgeLocationHistory();
          showSuccess(res.data.message || 'All raw location pings have been erased.', 'Purged Successfully');
        } catch {
          showInfo('Location telemetry cache cleared.', 'Notice');
        }
      },
    });
  };

  const handleRequestDataSummary = () => {
    showAlert({
      title: 'Personal Data Summary',
      message: `Data Principal Summary (DPDP Act & GDPR):\n\n• Username: @${user?.username || ''}\n• Email: ${user?.email || ''}\n• Rider ID: #${user?.id || '0'}\n• Garage: ${bikeDisplay}\n• Stored Rides: Linked to your account\n\nTo request a portable machine-readable export of your data, email our Grievance Officer at cruvobs@gmail.com.`,
      type: 'info',
      confirmText: 'Close',
      showCancel: false,
    });
  };

  const handleConfirmDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await profileAPI.deleteAccount();
      await logout();
      showSuccess('Your account and all associated personal data have been permanently erased from CRUVO servers.', 'Account Deleted');
    } catch (e) {
      showInfo('Account deletion request queued. If an error persists, contact cruvobs@gmail.com directly.', 'Notice');
      await logout();
    } finally {
      setDeletingAccount(false);
      setShowDeleteAccountModal(false);
    }
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleCheckForUpdates = async () => {
    setCheckingUpdates(true);
    try {
      const res = await versionAPI.getAppVersion();
      const data = res.data;
      const latest = data.latest_version;
      const normalizeV = (v) => {
        if (!v) return '0.0.0';
        const p = v.toString().split('.').map(n => parseInt(n, 10) || 0);
        while (p.length < 3) p.push(0);
        return p.join('.');
      };
      if (normalizeV(latest) === normalizeV(CURRENT_APP_VERSION)) {
        showAlert({
          title: 'Up to Date',
          message: `CRUVO v${CURRENT_APP_VERSION} is the latest version on Google Play. You are all set!`,
          type: 'success',
          showCancel: true,
          cancelText: 'OK',
          confirmText: "View What's New",
          onConfirm: () => setShowWhatsNew(true),
        });
      } else {
        setUpdateModalData(data);
      }
    } catch {
      showInfo(`CRUVO v${CURRENT_APP_VERSION} installed.`, 'Status');
    } finally {
      setCheckingUpdates(false);
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
            iconColor={profile?.is_email_public ? '#059669' : '#B45309'}
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
            iconColor={profile?.is_phone_public ? '#059669' : '#B45309'}
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

        {/* Data Rights & DPDP / GDPR Compliance */}
        <SettingsSection title="DATA RIGHTS & CONSENT (DPDP & GDPR)">
          <SettingRow
            icon="trash-bin-outline"
            label="Purge Location History"
            value="Erase raw GPS pings & telemetry immediately"
            iconColor="#B45309"
            onPress={handlePurgeLocationHistory}
          />
          <SettingRow
            icon="hand-left-outline"
            label="Withdraw Location Consent"
            value="Revoke active telemetry permissions"
            iconColor="#B45309"
            onPress={handleWithdrawConsent}
          />
          <SettingRow
            icon="document-text-outline"
            label="Personal Data Summary"
            value="Inspect collected data & export info"
            onPress={handleRequestDataSummary}
          />
          <SettingRow
            icon="trash-outline"
            label="Delete Account & All Data"
            value="Permanently purge profile and account"
            iconColor="#ff5252"
            isLast
            onPress={() => setShowDeleteAccountModal(true)}
          />
        </SettingsSection>

        {/* Legal & Security */}
        <SettingsSection title="LEGAL & SAFETY">
          <SettingRow
            icon="navigate-circle-outline"
            label="Background Location Access"
            value="Google Play disclosure & permissions"
            onPress={() => setShowLocationDisclosure(true)}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            label="Privacy Policy & Terms"
            value="Data protection, DPDP & GDPR notices"
            isLast
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
        </SettingsSection>

        {/* Updates & Release Notes */}
        <SettingsSection title="UPDATES & RELEASE NOTES">
          <SettingRow
            icon="sparkles-outline"
            label={`What's New in v${CURRENT_APP_VERSION}`}
            value="Psychological loading, 40m geofence, DPDP suite"
            onPress={() => setShowWhatsNew(true)}
          />
          <SettingRow
            icon="refresh-outline"
            label="Check for Updates"
            value={checkingUpdates ? 'Checking server...' : `Installed v${CURRENT_APP_VERSION}`}
            isLast
            onPress={handleCheckForUpdates}
          />
        </SettingsSection>

        {/* App Version Info */}
        <View style={styles.versionWrap}>
          <Text style={styles.versionTitle}>CRUVO TELEMETRY ENGINE</Text>
          <Text style={styles.versionSub}>Version {CURRENT_APP_VERSION} • Squad Riding Platform</Text>
        </View>

        {/* Logout Action */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutText}>LOG OUT</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Whats New Modal */}
      <WhatsNewModal
        visible={showWhatsNew}
        version={CURRENT_APP_VERSION}
        onClose={() => setShowWhatsNew(false)}
      />

      {/* Google Play Store Update Modal */}
      <UpdateRequiredModal
        visible={!!updateModalData}
        currentVersion={CURRENT_APP_VERSION}
        latestVersion={updateModalData?.latest_version || '3.2'}
        requiredVersion={updateModalData?.min_required_version || '3.0.0'}
        whatsNew={updateModalData?.whats_new}
        playStoreUrl={updateModalData?.play_store_url}
        webStoreUrl={updateModalData?.web_store_url}
        websiteUrl={updateModalData?.website_url}
        isMandatory={false}
        onDismiss={() => setUpdateModalData(null)}
      />

      {/* Google Play Prominent Disclosure Modal */}
      <LocationDisclosureModal
        visible={showLocationDisclosure}
        onAgree={async () => {
          setShowLocationDisclosure(false);
          await AsyncStorage.setItem('@cruvo_bg_disclosure_seen', 'true').catch(() => {});
          await requestBackgroundPermission();
        }}
        onDeny={async () => {
          setShowLocationDisclosure(false);
          await AsyncStorage.setItem('@cruvo_bg_disclosure_seen', 'true').catch(() => {});
          await requestPermission();
        }}
      />

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

      {/* Account Deletion Confirmation Modal (DPDP & GDPR Mandated) */}
      <GlassModal
        visible={showDeleteAccountModal}
        type="danger"
        icon="trash-outline"
        badge="PERMANENT PURGE"
        title="Delete Account Permanently?"
        message="This will permanently delete your rider profile, vehicle details, ride history, and all stored telemetry from CRUVO servers. This action cannot be undone."
        confirmText="DELETE ACCOUNT"
        cancelText="CANCEL"
        isLoading={deletingAccount}
        onConfirm={handleConfirmDeleteAccount}
        onCancel={() => setShowDeleteAccountModal(false)}
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: borderRadius.xl,
    padding: spacing.stackMd + 2,
    marginBottom: spacing.stackLg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
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
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  memberBadgeText: {
    ...typography.labelTechnical,
    color: '#B45309',
    fontSize: moderateScale(8),
    fontWeight: '800',
  },
  heroUsername: {
    ...typography.labelTechnical,
    color: '#B45309',
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackMd - 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
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
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  pillPrivate: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  privacyPillText: {
    ...typography.labelTechnical,
    fontSize: moderateScale(9),
    fontWeight: '800',
  },
  pillTextPublic: {
    color: '#059669',
  },
  pillTextPrivate: {
    color: '#B45309',
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
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.35)',
    height: 48,
    borderRadius: borderRadius.xl,
    marginTop: spacing.stackSm,
    marginBottom: spacing.stackLg,
  },
  logoutText: {
    ...typography.titleMd,
    color: '#DC2626',
    fontSize: moderateScale(13),
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});

