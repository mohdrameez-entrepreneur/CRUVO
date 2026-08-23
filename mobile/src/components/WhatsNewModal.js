import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, moderateScale } from '../theme';
import { versionAPI } from '../api';

const DEFAULT_WHATS_NEW = [
  {
    title: 'Friends-Only Privacy Controls',
    description: 'Select whether your Email and Phone number are kept private or shared strictly with confirmed friends.',
    icon: 'shield-checkmark-outline',
  },
  {
    title: 'Rider Profile Summary & Garage Cards',
    description: 'Inspect rider profiles, motorcycle specifications, and contact status badges directly from Explore.',
    icon: 'person-outline',
  },
  {
    title: 'Ride Auto-Naming & Optional Fields',
    description: 'Creating a ride is faster than ever with automatic ride naming based on your destination.',
    icon: 'navigate-outline',
  },
  {
    title: 'Real-Time Notifications & Instant Sync',
    description: 'Instant notification alerts when riders accept requests and immediate Explore screen updates.',
    icon: 'notifications-outline',
  },
  {
    title: 'Redesigned Luxury Dark Settings',
    description: 'Sleek new settings screen for garage preferences, privacy badges, and account security.',
    icon: 'options-outline',
  },
  {
    title: 'Live Ride Avatar Stop Indicators',
    description: 'Distinct visual stop badges on rider map avatars when flagging a stop during live rides.',
    icon: 'location-outline',
  },
];

export default function WhatsNewModal({
  visible,
  version = '2.0.0',
  whatsNewList = DEFAULT_WHATS_NEW,
  onClose,
}) {
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugCategory, setBugCategory] = useState('BUG');
  const [bugDescription, setBugDescription] = useState('');
  const [bugEmail, setBugEmail] = useState('');
  const [submittingBug, setSubmittingBug] = useState(false);

  const handleSubmitBugReport = async () => {
    if (!bugDescription.trim()) {
      Alert.alert('Required', 'Please describe the bug or feedback before submitting.');
      return;
    }
    setSubmittingBug(true);
    try {
      await versionAPI.submitBugReport({
        category: bugCategory,
        description: bugDescription.trim(),
        email: bugEmail.trim(),
        app_version: version,
      });
      Alert.alert('Feedback Received', 'Thank you! Your feedback has been sent directly to the CRUVO team.');
      setBugDescription('');
      setShowBugReport(false);
    } catch {
      Alert.alert('Error', 'Unable to submit feedback right now. Please try again.');
    } finally {
      setSubmittingBug(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Top Banner */}
          <View style={styles.header}>
            <View style={styles.headerBadge}>
              <Ionicons name="sparkles" size={14} color={colors.primaryContainer} />
              <Text style={styles.headerBadgeText}>VERSION {version} RELEASE</Text>
            </View>
            <Text style={styles.title}>WHAT'S NEW IN CRUVO</Text>
            <Text style={styles.subtitle}>
              We've upgraded your squad riding platform with powerful privacy tools and real-time improvements.
            </Text>
          </View>

          {/* Features Scroll View */}
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {whatsNewList.map((item, idx) => (
              <View key={idx} style={styles.featureRow}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name={item.icon} size={20} color={colors.primaryContainer} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{item.title}</Text>
                  <Text style={styles.featureDesc}>{item.description}</Text>
                </View>
              </View>
            ))}

            {/* Bug Report Query Section */}
            <View style={styles.bugCard}>
              <TouchableOpacity
                style={styles.bugHeaderRow}
                onPress={() => setShowBugReport(prev => !prev)}
                activeOpacity={0.8}
              >
                <View style={styles.bugHeaderLeft}>
                  <Ionicons name="bug-outline" size={18} color={colors.primaryContainer} />
                  <View>
                    <Text style={styles.bugTitle}>Spotted a bug or have feedback?</Text>
                    <Text style={styles.bugSubtitle}>Help us make CRUVO even better</Text>
                  </View>
                </View>
                <Ionicons
                  name={showBugReport ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.outline}
                />
              </TouchableOpacity>

              {showBugReport && (
                <View style={styles.bugForm}>
                  <View style={styles.categoryRow}>
                    {['BUG', 'FEEDBACK', 'FEATURE'].map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryChip, bugCategory === cat && styles.categoryChipActive]}
                        onPress={() => setBugCategory(cat)}
                      >
                        <Text style={[styles.categoryChipText, bugCategory === cat && styles.categoryChipTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={styles.bugInput}
                    placeholder="Describe what happened or share your feedback..."
                    placeholderTextColor={colors.outline}
                    value={bugDescription}
                    onChangeText={setBugDescription}
                    multiline
                    numberOfLines={3}
                  />

                  <TextInput
                    style={styles.emailInput}
                    placeholder="Your email (optional)"
                    placeholderTextColor={colors.outline}
                    value={bugEmail}
                    onChangeText={setBugEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    style={styles.submitBugBtn}
                    onPress={handleSubmitBugReport}
                    disabled={submittingBug}
                    activeOpacity={0.85}
                  >
                    {submittingBug ? (
                      <ActivityIndicator size="small" color={colors.black} />
                    ) : (
                      <>
                        <Ionicons name="paper-plane-outline" size={14} color={colors.black} />
                        <Text style={styles.submitBugText}>SUBMIT FEEDBACK</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.exploreBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.exploreBtnText}>EXPLORE CRUVO v{version}</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.onPrimaryContainer} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: spacing.marginMobile,
  },
  card: {
    maxHeight: '85%',
    backgroundColor: '#14161b',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.25)',
    padding: spacing.marginMobile,
    elevation: 10,
  },
  header: {
    marginBottom: spacing.stackSm,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.3)',
    marginBottom: 8,
  },
  headerBadgeText: {
    ...typography.labelTechnical,
    color: colors.primaryContainer,
    fontSize: moderateScale(10),
    fontWeight: '800',
  },
  title: {
    ...typography.displayHeader,
    color: colors.onSurface,
    fontSize: moderateScale(18),
    fontWeight: '900',
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.outline,
    fontSize: moderateScale(12),
    marginTop: 4,
  },
  scroll: {
    marginVertical: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontSize: moderateScale(13),
    fontWeight: '700',
  },
  featureDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(11),
    marginTop: 2,
  },
  bugCard: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 214, 0, 0.06)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.2)',
    padding: 12,
  },
  bugHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bugHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bugTitle: {
    ...typography.labelSm,
    color: colors.primaryContainer,
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  bugSubtitle: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: moderateScale(10),
  },
  bugForm: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 214, 0, 0.15)',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(255, 214, 0, 0.2)',
    borderColor: colors.primaryContainer,
  },
  categoryChipText: {
    ...typography.labelTechnical,
    color: colors.outline,
    fontSize: moderateScale(9),
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: colors.primaryContainer,
  },
  bugInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: colors.onSurface,
    padding: 10,
    fontSize: moderateScale(12),
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  emailInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: colors.onSurface,
    paddingHorizontal: 10,
    height: 38,
    fontSize: moderateScale(12),
    marginBottom: 10,
  },
  submitBugBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryContainer,
    height: 40,
    borderRadius: borderRadius.sm,
  },
  submitBugText: {
    ...typography.labelSm,
    color: colors.black,
    fontWeight: '800',
  },
  footer: {
    marginTop: 8,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryContainer,
    height: 48,
    borderRadius: borderRadius.md,
  },
  exploreBtnText: {
    ...typography.labelSm,
    color: colors.onPrimaryContainer,
    fontWeight: '800',
    fontSize: moderateScale(13),
  },
});
