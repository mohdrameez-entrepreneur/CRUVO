import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, moderateScale } from '../theme';

const DEFAULT_STEPS = [
  'Tap "DOWNLOAD UPDATE v2.0.0" below to open the official portal.',
  'Download the new CRUVO v2.0.0 installation package.',
  'Open the downloaded file on your device to install the update.',
  'Launch CRUVO v2.0.0 and enjoy the upgraded squad riding experience!',
];

export default function UpdateRequiredModal({
  visible,
  currentVersion = '1.0.0',
  requiredVersion = '2.0.0',
  downloadUrl = 'https://cruvoride.vercel.app',
  websiteUrl = 'https://cruvoride.vercel.app',
  updateSteps = DEFAULT_STEPS,
}) {
  const handleDownload = () => {
    Linking.openURL(downloadUrl || websiteUrl).catch(() => {});
  };

  const handleWebsite = () => {
    Linking.openURL(websiteUrl || downloadUrl).catch(() => {});
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Ionicons name="warning-outline" size={14} color="#ff5252" />
              <Text style={styles.badgeText}>CRITICAL UPDATE REQUIRED</Text>
            </View>
            <Text style={styles.title}>UPDATE CRUVO TO v{requiredVersion}</Text>
            <Text style={styles.subtitle}>
              Your installed version (v{currentVersion}) is outdated. Please update to v{requiredVersion} to continue using CRUVO services and live ride tracking.
            </Text>
          </View>

          <ScrollView style={styles.stepsScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepsTitle}>HOW TO DOWNLOAD & UPDATE:</Text>
            {updateSteps.map((step, idx) => (
              <View key={idx} style={styles.stepRow}>
                <View style={styles.stepNumberWrap}>
                  <Text style={styles.stepNumber}>{idx + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload} activeOpacity={0.85}>
              <Ionicons name="download-outline" size={18} color={colors.black} />
              <Text style={styles.downloadBtnText}>DOWNLOAD UPDATE v{requiredVersion}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.websiteBtn} onPress={handleWebsite} activeOpacity={0.8}>
              <Ionicons name="globe-outline" size={16} color={colors.onSurface} />
              <Text style={styles.websiteBtnText}>VISIT OFFICIAL WEBSITE</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    padding: spacing.marginMobile,
  },
  card: {
    maxHeight: '85%',
    backgroundColor: '#14161b',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.4)',
    padding: spacing.marginMobile,
    elevation: 12,
  },
  header: {
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.35)',
    marginBottom: 8,
  },
  badgeText: {
    ...typography.labelTechnical,
    color: '#ff5252',
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
    lineHeight: 18,
  },
  stepsScroll: {
    marginVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
  },
  stepsTitle: {
    ...typography.labelSm,
    color: colors.primaryContainer,
    fontSize: moderateScale(11),
    fontWeight: '800',
    marginBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  stepNumberWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    ...typography.labelTechnical,
    color: colors.primaryContainer,
    fontSize: moderateScale(10),
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    fontSize: moderateScale(11),
    lineHeight: 16,
  },
  buttonContainer: {
    marginTop: 10,
    gap: 8,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryContainer,
    height: 48,
    borderRadius: borderRadius.md,
  },
  downloadBtnText: {
    ...typography.labelSm,
    color: colors.black,
    fontWeight: '800',
    fontSize: moderateScale(12),
  },
  websiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    height: 42,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  websiteBtnText: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: moderateScale(11),
  },
});
