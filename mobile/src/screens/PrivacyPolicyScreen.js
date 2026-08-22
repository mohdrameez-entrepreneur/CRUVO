import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import NavBar from '../components/NavBar';
import { colors, spacing, typography, borderRadius, moderateScale } from '../theme';

const { width } = Dimensions.get('window');

const HIGHLIGHTS = [
  {
    icon: 'navigate-circle-outline',
    title: 'Live GPS Telemetry',
    desc: 'Location is only tracked and shared during an Active Ride with your accepted squad members.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Encrypted & Hardware-Backed',
    desc: 'Tokens are stored in your device OS secure keychain. Passwords are fully hashed.',
  },
  {
    icon: 'map-outline',
    title: 'Routing & Zero Ad Tracking',
    desc: 'Routes are calculated via TomTom & OpenStreetMap. We do not sell your personal data.',
  },
  {
    icon: 'person-remove-outline',
    title: 'Full User Control',
    desc: 'You can revoke location access, edit your rider profile, or request account deletion anytime.',
  },
];

const SECTIONS = [
  {
    title: '1. Information We Collect',
    icon: 'file-tray-full-outline',
    items: [
      'Account Data: Username, email address, password hash, and display name.',
      'Rider Profile: Optional bio, phone, city, motorcycle make/model, riding style, and experience level.',
      'Active GPS Telemetry: Real-time latitude, longitude, speed, and heading broadcasted during ongoing rides.',
      'Safety & Flag Stops: Road hazards, fuel, break, and issue stops created by you or your group.',
    ],
  },
  {
    title: '2. How Your Data Is Used',
    icon: 'sync-outline',
    items: [
      'Squad Coordination: Stream live locations on the group map so riders stay together.',
      'Route Calculation: Calculate route distance, elevation, travel duration, and polyline directions.',
      'Safety Alerts: Notify members when someone flags a fuel stop, mechanical issue, or rest break.',
    ],
  },
  {
    title: '3. Data Sharing & Boundaries',
    icon: 'people-outline',
    items: [
      'Visible to Squad: Active coordinates and stop flags are strictly shared with your ride participants.',
      'Private Rides: Closed rides are strictly restricted to invited members and cannot be discovered publicly.',
      'Infrastructure: Data is securely hosted on authenticated cloud databases with SSL/TLS encryption.',
    ],
  },
  {
    title: '4. Storage & Security Controls',
    icon: 'lock-closed-outline',
    items: [
      'Session Security: Authentication tokens are securely managed via hardware-level keychains.',
      'Location Pruning: High-frequency live coordinates update on a last-known basis to avoid excessive tracking trails.',
      'Permissions: You can disable location tracking at any time via device system settings.',
    ],
  },
  {
    title: '5. Contact & Inquiries',
    icon: 'mail-outline',
    items: [
      'Support & Inquiries: cruvobs@gmail.com',
      'Account Requests: Contact support for data export or deletion inquiries.',
    ],
  },
];

export default function PrivacyPolicyScreen({ navigation, route, onAgree }) {
  const insets = useSafeAreaInsets();
  const isFirstLaunch = route?.params?.isFirstLaunch || Boolean(onAgree);
  const [agreed, setAgreed] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  const handleAgreeAndContinue = async () => {
    if (!agreed && isFirstLaunch) return;
    try {
      await SecureStore.setItemAsync('has_agreed_privacy_policy', 'true');
    } catch (e) {
      console.warn('Failed to save policy agreement state', e);
    }
    if (onAgree) {
      onAgree();
    } else if (navigation?.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Onboarding');
    }
  };

  const toggleSection = (index) => {
    setExpandedSection(prev => (prev === index ? null : index));
  };

  return (
    <View style={styles.container}>
      <NavBar
        title="PRIVACY POLICY"
        showBack={!isFirstLaunch}
        onBack={() => navigation.goBack()}
        badge={isFirstLaunch ? 'TRUST & PRIVACY' : undefined}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: isFirstLaunch ? 140 : 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Hero */}
        <View style={styles.heroCard}>
          <View style={styles.shieldIconWrap}>
            <Ionicons name="shield" size={32} color={colors.primaryContainer} />
          </View>
          <Text style={styles.heroTitle}>Your Privacy Matters</Text>
          <Text style={styles.heroSubtitle}>
            CRUVO is built for riders by riders. We collect only what is necessary to deliver real-time group coordination, route navigation, and safety alerts.
          </Text>
          <Text style={styles.lastUpdated}>Effective Date: August 21, 2026</Text>
        </View>

        {/* Highlights Grid */}
        <Text style={styles.sectionHeaderTitle}>CORE PRINCIPLES</Text>
        <View style={styles.highlightsContainer}>
          {HIGHLIGHTS.map((item, idx) => (
            <View key={idx} style={styles.highlightCard}>
              <View style={styles.highlightIcon}>
                <Ionicons name={item.icon} size={22} color={colors.primaryContainer} />
              </View>
              <View style={styles.highlightTextWrap}>
                <Text style={styles.highlightTitle}>{item.title}</Text>
                <Text style={styles.highlightDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Detailed Sections */}
        <Text style={styles.sectionHeaderTitle}>DETAILED POLICIES</Text>
        {SECTIONS.map((sec, idx) => {
          const isExpanded = expandedSection === idx;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.accordionCard, isExpanded && styles.accordionCardActive]}
              onPress={() => toggleSection(idx)}
              activeOpacity={0.7}
            >
              <View style={styles.accordionHeader}>
                <Ionicons name={sec.icon} size={20} color={isExpanded ? colors.primaryContainer : colors.onSurfaceVariant} />
                <Text style={[styles.accordionTitle, isExpanded && styles.accordionTitleActive]}>
                  {sec.title}
                </Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.onSurfaceVariant}
                />
              </View>

              {isExpanded && (
                <View style={styles.accordionBody}>
                  {sec.items.map((bullet, bIdx) => (
                    <View key={bIdx} style={styles.bulletRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom Agreement Floating Bar */}
      {isFirstLaunch ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAgreed(prev => !prev)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Ionicons name="checkmark" size={16} color={colors.onPrimaryContainer} />}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read and agree to the <Text style={styles.checkboxLabelHighlight}>Privacy Policy & Terms</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.agreeButton, !agreed && styles.agreeButtonDisabled]}
            onPress={handleAgreeAndContinue}
            disabled={!agreed}
            activeOpacity={0.85}
          >
            <Text style={[styles.agreeButtonText, !agreed && styles.agreeButtonTextDisabled]}>
              AGREE & GET STARTED
            </Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={agreed ? colors.onPrimaryContainer : colors.outline}
            />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: spacing.stackSm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  badgeText: {
    ...typography.labelTechnical,
    fontSize: moderateScale(10),
    color: colors.primaryContainer,
    letterSpacing: 0.5,
  },
  topBarTitle: {
    ...typography.displayLg,
    color: colors.primaryContainer,
    fontSize: moderateScale(18),
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.marginMobile,
  },
  heroCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    padding: spacing.stackMd + 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.stackLg,
  },
  shieldIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.stackMd,
  },
  heroTitle: {
    ...typography.headlineLgMobile,
    color: colors.onSurface,
    fontSize: moderateScale(22),
    marginBottom: spacing.stackSm,
  },
  heroSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: moderateScale(20),
    marginBottom: spacing.stackSm,
  },
  lastUpdated: {
    ...typography.labelSm,
    color: colors.primaryContainer,
    opacity: 0.9,
    marginTop: 4,
  },
  sectionHeaderTitle: {
    ...typography.labelTechnical,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(12),
    letterSpacing: 1.2,
    marginBottom: spacing.stackSm + 2,
    marginLeft: 4,
  },
  highlightsContainer: {
    gap: spacing.stackSm + 2,
    marginBottom: spacing.stackLg,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.stackMd,
    gap: spacing.stackSm + 4,
  },
  highlightIcon: {
    marginTop: 2,
  },
  highlightTextWrap: {
    flex: 1,
  },
  highlightTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontSize: moderateScale(14),
    fontWeight: '700',
    marginBottom: 2,
  },
  highlightDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(13),
    lineHeight: moderateScale(18),
  },
  accordionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.stackMd,
    marginBottom: spacing.stackSm + 2,
  },
  accordionCardActive: {
    borderColor: colors.primaryContainer,
    backgroundColor: colors.surfaceContainerLow,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.stackSm,
  },
  accordionTitle: {
    flex: 1,
    ...typography.titleMd,
    color: colors.onSurface,
    fontSize: moderateScale(14),
  },
  accordionTitleActive: {
    color: colors.primaryContainer,
    fontWeight: '700',
  },
  accordionBody: {
    marginTop: spacing.stackMd,
    paddingTop: spacing.stackSm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    gap: spacing.stackSm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.stackSm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryContainer,
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(13),
    lineHeight: moderateScale(19),
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackMd,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.stackMd,
    gap: spacing.stackSm + 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  checkboxLabel: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    fontSize: moderateScale(13),
  },
  checkboxLabelHighlight: {
    color: colors.primaryContainer,
    fontWeight: '700',
  },
  agreeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryContainer,
    height: 52,
    borderRadius: borderRadius.lg,
    gap: spacing.stackSm,
  },
  agreeButtonDisabled: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  agreeButtonText: {
    ...typography.titleMd,
    color: colors.onPrimaryContainer,
    fontSize: moderateScale(15),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  agreeButtonTextDisabled: {
    color: colors.outline,
  },
});
