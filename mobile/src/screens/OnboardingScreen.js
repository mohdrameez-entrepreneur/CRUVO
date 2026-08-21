import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.heroSection}>
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>IGNITION</Text>
          <Text style={styles.heroSubtitle}>Group Motorcycle Touring</Text>
        </View>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.handle} />

        <View style={styles.stepIndicator}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <Text style={styles.headline}>Ride together.{'\n'}Stay connected.</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Signup')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>
            ALREADY HAVE AN ACCOUNT? <Text style={styles.linkBold}>LOG IN</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroSection: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'flex-end',
    padding: spacing.marginMobile,
  },
  heroOverlay: {
    marginBottom: spacing.stackLg,
  },
  heroTitle: {
    ...typography.displayLg,
    color: colors.primaryContainer,
    textTransform: 'uppercase',
    letterSpacing: -1.6,
  },
  heroSubtitle: {
    ...typography.bodyLg,
    color: colors.onSurfaceVariant,
    marginTop: spacing.stackSm,
  },
  bottomSheet: {
    backgroundColor: colors.surfaceContainerLow,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackMd,
    paddingBottom: spacing.stackLg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: spacing.stackMd,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.stackMd,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.outlineVariant,
  },
  dotActive: {
    backgroundColor: colors.primaryContainer,
    width: 24,
  },
  headline: {
    ...typography.headlineLgMobile,
    color: colors.onSurface,
    marginBottom: spacing.stackLg,
  },
  primaryButton: {
    backgroundColor: colors.primaryContainer,
    height: spacing.touchTargetMin,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.stackMd,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 4,
  },
  primaryButtonText: {
    ...typography.titleMd,
    color: colors.onPrimaryContainer,
    textTransform: 'uppercase',
  },
  linkText: {
    ...typography.labelTechnical,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.stackMd,
  },
  linkBold: {
    color: colors.primaryContainer,
  },
  skipText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
