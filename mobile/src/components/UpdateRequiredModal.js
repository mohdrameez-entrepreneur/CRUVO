import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, moderateScale } from '../theme';

const DEFAULT_WHATS_NEW = [
  {
    title: 'Psychological Telemetry Loading Engine',
    description: 'Dynamic multi-stage telemetry warm-up and perceived-progress feedback during server spin-ups.',
    icon: 'flash-outline',
  },
  {
    title: 'High-Precision 40m Arrival Geofence',
    description: 'Fixed premature ride auto-completion by narrowing geofence to 40m with lead rider arrival prompt.',
    icon: 'navigate-circle-outline',
  },
  {
    title: 'Android Foreground Service & Sticky Notification',
    description: 'Persistent live ride notification that protects background GPS telemetry from aggressive OS battery killers.',
    icon: 'notifications-outline',
  },
  {
    title: 'DPDP Act 2023 & GDPR Privacy Suite',
    description: 'One-tap in-app controls to purge location history, review stored data summaries, or delete your entire account.',
    icon: 'shield-checkmark-outline',
  },
  {
    title: 'Automated Stale Telemetry Purging',
    description: 'Server automatically wipes raw location breadcrumbs upon ride completion to guarantee rider privacy.',
    icon: 'trash-outline',
  },
  {
    title: 'Google Play Prominent Location Disclosure',
    description: 'Explicit, transparent privacy consent modal detailing why background GPS is required for squad tracking.',
    icon: 'map-outline',
  },
];

export default function UpdateRequiredModal({
  visible,
  currentVersion = '3.0.0',
  latestVersion = '3.2',
  requiredVersion = '3.0.0',
  whatsNew = DEFAULT_WHATS_NEW,
  playStoreUrl = 'market://details?id=com.cruvo.app',
  webStoreUrl = 'https://play.google.com/store/apps/details?id=com.cruvo.app',
  websiteUrl = 'https://cruvo-web.onrender.com',
  isMandatory = false,
  onDismiss,
}) {
  const handleOpenPlayStore = async () => {
    const marketUrl = playStoreUrl || 'market://details?id=com.cruvo.app';
    const webUrl = webStoreUrl || 'https://play.google.com/store/apps/details?id=com.cruvo.app';

    if (Platform.OS === 'android') {
      try {
        const canOpen = await Linking.canOpenURL(marketUrl);
        if (canOpen) {
          await Linking.openURL(marketUrl);
          return;
        }
      } catch (err) {
        console.log('[PlayStore] Market scheme fallback:', err);
      }
    }

    try {
      await Linking.openURL(webUrl);
    } catch (e) {
      console.log('[PlayStore] Web URL fallback failed:', e);
    }
  };

  const handleWebsite = () => {
    Linking.openURL(websiteUrl || 'https://cruvo-web.onrender.com').catch(() => {});
  };

  const featureList = whatsNew && whatsNew.length > 0 ? whatsNew : DEFAULT_WHATS_NEW;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, isMandatory && styles.cardMandatory]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.badge, isMandatory ? styles.badgeMandatory : styles.badgeRecommended]}>
              <Ionicons
                name={isMandatory ? 'warning-outline' : 'logo-google-playstore'}
                size={14}
                color={isMandatory ? '#ff5252' : colors.primaryContainer}
              />
              <Text style={[styles.badgeText, isMandatory ? styles.badgeTextMandatory : styles.badgeTextRecommended]}>
                {isMandatory ? 'MANDATORY UPDATE REQUIRED' : 'NEW UPDATE ON GOOGLE PLAY'}
              </Text>
            </View>

            <Text style={styles.title}>UPDATE CRUVO TO v{latestVersion}</Text>
            <Text style={styles.subtitle}>
              {isMandatory
                ? `Your installed version (v${currentVersion}) is deprecated. Please update to v${latestVersion} to continue using CRUVO real-time services.`
                : `A new version (v${latestVersion}) is available on Google Play with improved squad telemetry, geofencing precision, and privacy controls.`}
            </Text>
          </View>

          {/* What's New Feature List */}
          <View style={styles.whatsNewHeader}>
            <Ionicons name="sparkles" size={14} color={colors.primaryContainer} />
            <Text style={styles.whatsNewTitle}>WHAT'S NEW IN v{latestVersion}:</Text>
          </View>

          <ScrollView style={styles.featuresScroll} showsVerticalScrollIndicator={false}>
            {featureList.map((item, idx) => (
              <View key={idx} style={styles.featureItem}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name={item.icon || 'checkmark-circle-outline'} size={18} color={colors.primaryContainer} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureItemTitle}>{item.title}</Text>
                  <Text style={styles.featureItemDesc}>{item.description}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.playStoreBtn} onPress={handleOpenPlayStore} activeOpacity={0.85}>
              <Ionicons name="logo-google-playstore" size={20} color={colors.onPrimaryContainer} />
              <Text style={styles.playStoreBtnText}>UPDATE ON GOOGLE PLAY</Text>
            </TouchableOpacity>

            {!isMandatory && onDismiss ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss} activeOpacity={0.8}>
                <Text style={styles.secondaryBtnText}>REMIND ME LATER</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleWebsite} activeOpacity={0.8}>
                <Ionicons name="globe-outline" size={16} color={colors.onSurfaceVariant} />
                <Text style={styles.secondaryBtnText}>VISIT OFFICIAL PORTAL</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 25, 47, 0.55)',
    justifyContent: 'center',
    padding: spacing.marginMobile,
  },
  card: {
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(10, 25, 47, 0.08)',
    padding: spacing.marginMobile,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  cardMandatory: {
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },
  header: {
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginBottom: 8,
  },
  badgeRecommended: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  badgeMandatory: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  badgeText: {
    ...typography.labelTechnical,
    fontSize: moderateScale(9.5),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeTextRecommended: {
    color: '#B45309',
  },
  badgeTextMandatory: {
    color: '#DC2626',
  },
  title: {
    ...typography.headlineLgMobile,
    color: colors.primary,
    fontSize: moderateScale(19),
    fontWeight: '800',
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(11.5),
    marginTop: 4,
    lineHeight: 16,
  },
  whatsNewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 6,
  },
  whatsNewTitle: {
    ...typography.labelTechnical,
    color: colors.primary,
    fontSize: moderateScale(10.5),
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  featuresScroll: {
    maxHeight: 250,
    marginVertical: 4,
    backgroundColor: colors.surfaceDim,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextWrap: {
    flex: 1,
  },
  featureItemTitle: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontSize: moderateScale(12),
    fontWeight: '800',
  },
  featureItemDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(10.5),
    lineHeight: 14,
    marginTop: 1,
  },
  buttonContainer: {
    marginTop: 12,
    gap: 8,
  },
  playStoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryContainer,
    height: 48,
    borderRadius: borderRadius.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  playStoreBtnText: {
    ...typography.labelSm,
    color: colors.onPrimaryContainer,
    fontWeight: '800',
    fontSize: moderateScale(12.5),
    letterSpacing: 0.4,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceDim,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  secondaryBtnText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
    fontSize: moderateScale(11),
  },
});
